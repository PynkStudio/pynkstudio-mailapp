/**
 * Ready-made Node/Vercel handlers for the mailbox endpoints.
 *
 * Each factory takes the host context and returns a `(req, res)` function, so a
 * consumer's route file is a single re-export.
 */
import { resolveAttachmentDownloadUrl } from "../mailbox/attachment.js";
import { handleResendWebhookEvent } from "../mailbox/inbound.js";
import { loadMailbox, parseMailboxPage, parseMailboxView } from "../mailbox/inbox.js";
import { applyMailMessageAction, isMailMessageAction } from "../mailbox/message-actions.js";
import { sendMailboxMessage, splitRecipients } from "../mailbox/send.js";
import { verifySvixSignature } from "../mailbox/webhook-signature.js";
import { mailboxUserDisplayName, requireMailboxAdmin, resendKeyOf, } from "./context.js";
import { bearerToken, firstHeader, firstQueryParam, methodNotAllowed, readJsonBody, readRawBody, sendJson, } from "./http.js";
/** `GET /api/email/inbox?view=&page=&q=` */
export function createInboxHandler(ctx) {
    return async (req, res) => {
        if (req.method !== "GET")
            return methodNotAllowed(res);
        const auth = await requireMailboxAdmin(ctx, req, res);
        if (!auth)
            return;
        try {
            const payload = await loadMailbox(auth.db, ctx.config, {
                view: parseMailboxView(firstQueryParam(req, "view")),
                page: parseMailboxPage(firstQueryParam(req, "page")),
                search: firstQueryParam(req, "q") ?? "",
                resendApiKey: resendKeyOf(ctx),
            });
            sendJson(res, 200, payload);
        }
        catch (error) {
            console.error("[mailbox/inbox] failed", error);
            sendJson(res, 500, { error: "mailbox_load_failed" });
        }
    };
}
function normalizeAttachments(input) {
    if (!Array.isArray(input))
        return [];
    return input
        .map((attachment) => ({
        filename: (attachment.filename ?? "").trim(),
        content: (attachment.content ?? "").trim(),
        contentType: (attachment.contentType ?? "").trim() || undefined,
        size: Number.isFinite(attachment.size) ? Number(attachment.size) : 0,
    }))
        .filter((attachment) => attachment.filename && attachment.content);
}
/** `POST /api/email/send` */
export function createSendHandler(ctx) {
    return async (req, res) => {
        if (req.method !== "POST")
            return methodNotAllowed(res);
        const auth = await requireMailboxAdmin(ctx, req, res);
        if (!auth)
            return;
        let body;
        try {
            body = await readJsonBody(req);
        }
        catch {
            return sendJson(res, 400, { error: "invalid_body" });
        }
        try {
            const result = await sendMailboxMessage(auth.db, ctx.config, resendKeyOf(ctx), {
                fromOptionId: body.fromOptionId,
                to: splitRecipients(body.to),
                cc: splitRecipients(body.cc),
                bcc: splitRecipients(body.bcc),
                subject: body.subject ?? "",
                html: body.html,
                text: body.text,
                attachments: normalizeAttachments(body.attachments),
                replyToMessageId: body.replyToMessageId,
                sentByUserId: auth.user.id,
                sentByName: mailboxUserDisplayName(auth.user),
            });
            if (!result.ok) {
                const status = result.error === "missing_fields"
                    ? 400
                    : result.error === "attachments_too_large"
                        ? 413
                        : result.error === "resend_not_configured"
                            ? 503
                            : 502;
                return sendJson(res, status, { error: result.error, ...(result.details ? { details: result.details } : {}) });
            }
            sendJson(res, 200, { ok: true, messageId: result.messageId });
        }
        catch (error) {
            console.error("[mailbox/send] failed", error);
            sendJson(res, 500, { error: "send_failed" });
        }
    };
}
/** `POST /api/email/message` with `{ id, action }` */
export function createMessageActionHandler(ctx) {
    return async (req, res) => {
        if (req.method !== "POST")
            return methodNotAllowed(res);
        const auth = await requireMailboxAdmin(ctx, req, res);
        if (!auth)
            return;
        let body;
        try {
            body = await readJsonBody(req);
        }
        catch {
            return sendJson(res, 400, { error: "invalid_body" });
        }
        const id = (body.id ?? "").trim();
        if (!id || !isMailMessageAction(body.action)) {
            return sendJson(res, 400, { error: "missing_fields" });
        }
        try {
            await applyMailMessageAction(auth.db, ctx.config, id, body.action, { push: ctx.push });
            sendJson(res, 200, { ok: true });
        }
        catch (error) {
            console.error("[mailbox/message] failed", error);
            sendJson(res, 500, { error: "message_action_failed" });
        }
    };
}
/** `GET /api/email/attachment?messageId=&attachmentId=` */
export function createAttachmentHandler(ctx) {
    return async (req, res) => {
        if (req.method !== "GET")
            return methodNotAllowed(res);
        const auth = await requireMailboxAdmin(ctx, req, res);
        if (!auth)
            return;
        const messageId = firstQueryParam(req, "messageId");
        const attachmentId = firstQueryParam(req, "attachmentId");
        if (!messageId || !attachmentId)
            return sendJson(res, 400, { error: "missing_params" });
        try {
            const result = await resolveAttachmentDownloadUrl(auth.db, ctx.config, resendKeyOf(ctx), {
                messageId,
                attachmentId,
            });
            if (!result.ok) {
                const status = result.error === "resend_not_configured" ? 503 : result.error === "attachment_fetch_failed" ? 502 : 404;
                return sendJson(res, status, { error: result.error });
            }
            sendJson(res, 200, { downloadUrl: result.downloadUrl });
        }
        catch (error) {
            console.error("[mailbox/attachment] failed", error);
            sendJson(res, 500, { error: "attachment_failed" });
        }
    };
}
/** `POST /api/webhooks/email/inbound` — Resend inbound + delivery events. */
export function createInboundWebhookHandler(ctx) {
    return async (req, res) => {
        if (req.method !== "POST")
            return methodNotAllowed(res);
        const rawBody = await readRawBody(req);
        // An internal test may authenticate with a shared secret instead of a signature.
        const testSecret = ctx.internalTestSecret?.();
        const token = bearerToken(req);
        const isInternalTest = Boolean(testSecret && token && token === testSecret);
        if (!isInternalTest &&
            !verifySvixSignature({
                secret: ctx.webhookSecret?.(),
                rawBody,
                headers: {
                    id: firstHeader(req, "svix-id"),
                    timestamp: firstHeader(req, "svix-timestamp"),
                    signature: firstHeader(req, "svix-signature"),
                },
            })) {
            return sendJson(res, 401, { error: "invalid_signature" });
        }
        let payload;
        try {
            payload = JSON.parse(rawBody);
        }
        catch {
            return sendJson(res, 400, { error: "invalid_body" });
        }
        try {
            const result = await handleResendWebhookEvent(ctx.createServiceClient(), ctx.config, payload, {
                resendApiKey: resendKeyOf(ctx),
                push: ctx.push
                    ? {
                        send: ctx.push.send,
                        options: ctx.push.options,
                        title: ctx.push.title ?? ((assigned) => (assigned ? "Nuova mail assegnata" : "Nuova mail")),
                    }
                    : undefined,
            });
            if (result.kind === "error")
                return sendJson(res, 400, { error: result.error });
            sendJson(res, 200, { ok: true });
        }
        catch (error) {
            console.error("[mailbox/inbound] failed", error);
            sendJson(res, 500, { error: "webhook_failed" });
        }
    };
}
//# sourceMappingURL=routes.js.map