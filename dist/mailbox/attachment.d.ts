/**
 * Resolves a download URL for an inbound attachment.
 *
 * Resend's links are signed and expire, so the stored one is reused while fresh
 * and re-signed through the API otherwise — the refreshed metadata is written
 * back so the next request hits the cheap path.
 */
import type { MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
export type ResolveAttachmentResult = {
    ok: true;
    downloadUrl: string;
} | {
    ok: false;
    error: "message_not_found" | "attachment_not_found" | "resend_not_configured" | "attachment_fetch_failed";
};
export declare function resolveAttachmentDownloadUrl(db: MailboxDb, config: MailboxConfig, resendApiKey: string | undefined, input: {
    messageId: string;
    attachmentId: string;
}): Promise<ResolveAttachmentResult>;
//# sourceMappingURL=attachment.d.ts.map