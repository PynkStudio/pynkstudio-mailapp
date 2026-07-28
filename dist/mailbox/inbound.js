/**
 * Resend webhook handling, framework-agnostic.
 *
 * Two event families arrive on the same endpoint:
 *  - `email.received` — a new inbound message. The payload carries no body, so
 *    the id is used to retrieve the full content, then the row is threaded,
 *    routed to an admin and announced by push.
 *  - delivery events (`email.delivered`, `.bounced`, `.complained`, …) — logged
 *    to the tracking table and reflected on the sent row's status.
 */
import { parseEmailAddress } from "../core/index.js";
import { detectMailBrand, normalizeAddress } from "./address.js";
import { resolveMailAssignment } from "./assignment.js";
import { asStringArray, extractHeaderValue, extractMessageIds, normalizeHeaders, normalizeMessageId, } from "./message-id.js";
import { sendMailPushNotification } from "./push.js";
import { retrieveReceivedEmailContent } from "./resend-client.js";
import { fallbackThreadKey, resolveConversationThreadKey } from "./threading.js";
export function eventToSentStatus(type) {
    if (type === "email.delivered")
        return "delivered";
    if (type === "email.delivery_delayed")
        return "delivery_delayed";
    if (type === "email.bounced")
        return "bounced";
    if (type === "email.complained")
        return "complained";
    if (type === "email.opened")
        return "opened";
    if (type === "email.clicked")
        return "clicked";
    return null;
}
function nestedEmailId(data) {
    const email = data.email;
    if (email && typeof email === "object" && "id" in email) {
        const id = email.id;
        return typeof id === "string" ? id : "";
    }
    return "";
}
export function resendEmailIdOf(data) {
    return typeof data.email_id === "string"
        ? data.email_id
        : typeof data.id === "string"
            ? data.id
            : nestedEmailId(data);
}
async function isSpamSender(db, config, address) {
    const { data } = await db
        .from(config.tables.spamSenders)
        .select("id")
        .eq("address", normalizeAddress(address))
        .maybeSingle();
    return Boolean(data);
}
export async function handleResendWebhookEvent(db, config, payload, options = {}) {
    const eventType = String(payload.type ?? "");
    const data = (payload.data && typeof payload.data === "object" ? payload.data : payload);
    // A bare payload with a `from` is a received message sent without an envelope.
    if (eventType === "email.received" || (!eventType && typeof data.from === "string")) {
        const inboundEmailId = resendEmailIdOf(data);
        const content = inboundEmailId
            ? await retrieveReceivedEmailContent(options.resendApiKey, inboundEmailId, {
                logPrefix: "[mailbox/inbound]",
            })
            : null;
        const from = String(content?.from ?? data.from ?? "");
        const to = content?.to?.length ? content.to : asStringArray(data.to);
        if (!from || to.length === 0)
            return { kind: "error", error: "missing_from_to" };
        const parsedFrom = parseEmailAddress(from);
        const headers = normalizeHeaders(content?.headers ?? data.headers);
        const subject = typeof content?.subject === "string"
            ? content.subject
            : typeof data.subject === "string"
                ? data.subject
                : config.noSubjectLabel;
        const messageId = normalizeMessageId(content?.message_id) ??
            normalizeMessageId(data.message_id) ??
            normalizeMessageId(extractHeaderValue(headers, "message-id"));
        const inReplyTo = normalizeMessageId(data.in_reply_to) ??
            extractMessageIds(extractHeaderValue(headers, "in-reply-to"))[0] ??
            null;
        const references = Array.from(new Set([
            ...extractMessageIds(data.references),
            ...extractMessageIds(extractHeaderValue(headers, "references")),
            ...(inReplyTo ? [inReplyTo] : []),
        ]));
        const threadKey = await resolveConversationThreadKey(db, config, references.length > 0 ? references : messageId ? [messageId] : [], fallbackThreadKey({
            subject,
            addresses: [parsedFrom.address, ...to],
            noSubjectLabel: config.noSubjectLabel,
        }));
        const assignment = await resolveMailAssignment(db, config, to);
        const { data: insertedEmail, error } = await db
            .from(config.tables.inbound)
            .insert({
            resend_email_id: inboundEmailId || null,
            message_id: messageId,
            thread_key: threadKey,
            in_reply_to: inReplyTo,
            references,
            from_address: parsedFrom.address,
            from_name: parsedFrom.name,
            to_addresses: to,
            subject,
            text_body: typeof content?.text === "string" ? content.text : typeof data.text === "string" ? data.text : null,
            html_body: typeof content?.html === "string" ? content.html : typeof data.html === "string" ? data.html : null,
            headers,
            attachments: Array.isArray(content?.attachments)
                ? content.attachments
                : Array.isArray(data.attachments)
                    ? data.attachments
                    : [],
            brand: detectMailBrand(config, to),
            assigned_to_profile_id: assignment.assignedProfileId,
            assignment_reason: assignment.reason,
            spam: await isSpamSender(db, config, parsedFrom.address),
        })
            .select("id, subject")
            .maybeSingle();
        if (error)
            throw error;
        const insertedId = insertedEmail?.id ?? null;
        let pushSent = false;
        if (options.push) {
            pushSent = await sendMailPushNotification(db, config, options.push.send, assignment.notifyProfileIds, {
                type: "mail",
                title: options.push.title(Boolean(assignment.assignedProfileId)),
                body: `${parsedFrom.name || parsedFrom.address}: ${subject}`,
                url: config.messageUrl(insertedId),
                tag: insertedId ? `mail:${insertedId}` : undefined,
            }, options.push.options).catch((pushError) => {
                console.error("[mailbox/inbound] push failed", pushError);
                return false;
            });
            if (pushSent && insertedId) {
                await db
                    .from(config.tables.inbound)
                    .update({ push_notified_at: new Date().toISOString() })
                    .eq("id", insertedId);
            }
        }
        return { kind: "received", id: insertedId, pushSent };
    }
    const resendEmailId = resendEmailIdOf(data);
    if (!resendEmailId || !eventType)
        return { kind: "ignored" };
    const status = eventToSentStatus(eventType);
    await db.from(config.tables.trackingEvents).insert({
        resend_email_id: resendEmailId,
        event_type: eventType,
        from_address: typeof data.from === "string" ? parseEmailAddress(data.from).address : null,
        to_address: typeof data.to === "string" ? parseEmailAddress(data.to).address : null,
        subject: typeof data.subject === "string" ? data.subject : null,
        metadata: data,
    });
    if (status) {
        await db.from(config.tables.sent).update({ status }).eq("resend_message_id", resendEmailId);
    }
    return { kind: "tracking", status };
}
//# sourceMappingURL=inbound.js.map