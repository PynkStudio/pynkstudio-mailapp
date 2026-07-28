/**
 * Resolves a download URL for an inbound attachment.
 *
 * Resend's links are signed and expire, so the stored one is reused while fresh
 * and re-signed through the API otherwise — the refreshed metadata is written
 * back so the next request hits the cheap path.
 */
import { attachmentIsFresh, retrieveReceivedAttachment } from "./resend-client.js";
export async function resolveAttachmentDownloadUrl(db, config, resendApiKey, input) {
    const { data: message, error } = await db
        .from(config.tables.inbound)
        .select("id,resend_email_id,attachments")
        .eq("id", input.messageId)
        .maybeSingle();
    if (error)
        throw error;
    const resendEmailId = message?.resend_email_id;
    if (!resendEmailId)
        return { ok: false, error: "message_not_found" };
    const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
    const stored = attachments.find((attachment) => attachment.id === input.attachmentId);
    if (stored && attachmentIsFresh(stored)) {
        return { ok: true, downloadUrl: stored.download_url };
    }
    if (!resendApiKey)
        return { ok: false, error: "resend_not_configured" };
    const refreshed = await retrieveReceivedAttachment(resendApiKey, resendEmailId, input.attachmentId);
    if (!refreshed)
        return { ok: false, error: "attachment_fetch_failed" };
    if (!refreshed.download_url)
        return { ok: false, error: "attachment_not_found" };
    const nextAttachments = attachments.map((item) => item.id === input.attachmentId ? { ...item, ...refreshed } : item);
    await db.from(config.tables.inbound).update({ attachments: nextAttachments }).eq("id", input.messageId);
    return { ok: true, downloadUrl: refreshed.download_url };
}
//# sourceMappingURL=attachment.js.map