/**
 * Resend HTTP calls used by the mailbox: retrieving a received message's full
 * content, refreshing an expiring attachment link, and sending outbound mail
 * with threading headers.
 */
const RESEND_API = "https://api.resend.com";
function authHeaders(apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
}
/**
 * Fetches the stored body/headers/attachments of a received message.
 *
 * The inbound webhook payload does not include the body, so this call is what
 * turns an `email.received` event into a readable message. Returns null on any
 * failure — callers persist whatever the webhook payload carried instead.
 */
export async function retrieveReceivedEmailContent(apiKey, emailId, options = {}) {
    if (!apiKey || !emailId)
        return null;
    const response = await fetch(`${RESEND_API}/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`, { headers: authHeaders(apiKey) });
    if (!response.ok) {
        const details = await response.text().catch(() => "");
        console.error(`${options.logPrefix ?? "[mailbox]"} received email fetch failed`, response.status, details);
        return null;
    }
    return (await response.json());
}
/** Re-signs a single inbound attachment, returning its fresh download URL. */
export async function retrieveReceivedAttachment(apiKey, emailId, attachmentId) {
    const response = await fetch(`${RESEND_API}/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`, { headers: authHeaders(apiKey) });
    if (!response.ok) {
        const details = await response.text().catch(() => "");
        console.error("[mailbox] attachment fetch failed", response.status, details);
        return null;
    }
    return (await response.json());
}
/** True when a stored link is still usable, with a minute of headroom. */
export function attachmentIsFresh(attachment) {
    if (!attachment.download_url)
        return false;
    if (!attachment.expires_at)
        return true;
    return Date.parse(attachment.expires_at) > Date.now() + 60_000;
}
/** Sends a message through Resend, emitting RFC 5322 threading headers. */
export async function sendOutboundEmail(apiKey, input) {
    const headers = {};
    if (input.messageId)
        headers["Message-ID"] = `<${input.messageId}>`;
    if (input.inReplyTo)
        headers["In-Reply-To"] = `<${input.inReplyTo}>`;
    if (input.references?.length)
        headers.References = input.references.map((id) => `<${id}>`).join(" ");
    for (const header of input.extraHeaders ?? [])
        headers[header.name] = header.value;
    const response = await fetch(`${RESEND_API}/emails`, {
        method: "POST",
        headers: { ...authHeaders(apiKey), "Content-Type": "application/json" },
        body: JSON.stringify({
            from: input.from,
            to: input.to,
            ...(input.cc?.length ? { cc: input.cc } : {}),
            ...(input.bcc?.length ? { bcc: input.bcc } : {}),
            subject: input.subject,
            html: input.html,
            ...(input.text ? { text: input.text } : {}),
            ...(input.attachments?.length
                ? {
                    attachments: input.attachments.map((attachment) => ({
                        filename: attachment.filename,
                        content: attachment.content,
                        ...(attachment.contentType ? { content_type: attachment.contentType } : {}),
                    })),
                }
                : {}),
            ...(Object.keys(headers).length > 0 ? { headers } : {}),
        }),
    });
    if (!response.ok) {
        return { ok: false, details: await response.text().catch(() => "") };
    }
    const result = (await response.json());
    return { ok: true, messageId: result.id ?? null };
}
//# sourceMappingURL=resend-client.js.map