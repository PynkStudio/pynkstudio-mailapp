/**
 * Outbound send: resolves the thread the message belongs to, emits the RFC 5322
 * threading headers so the recipient's client groups it correctly, sends through
 * Resend, then records the row in the sent table.
 */
import { type MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
import { type OutboundAttachment } from "./resend-client.js";
export type SendMailboxInput = {
    fromOptionId?: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: OutboundAttachment[];
    /** Id of the inbound or sent row being replied to. */
    replyToMessageId?: string;
    /** Recorded on the sent row for audit. */
    sentByUserId?: string | null;
    sentByName?: string | null;
};
export type SendMailboxResult = {
    ok: true;
    messageId: string | null;
    threadKey: string;
} | {
    ok: false;
    error: "missing_fields" | "attachments_too_large" | "resend_not_configured" | "resend_send_failed";
    details?: string;
};
/** Splits a raw recipient field on commas, semicolons and newlines. */
export declare function splitRecipients(value: string | undefined): string[];
export declare function sendMailboxMessage(db: MailboxDb, config: MailboxConfig, resendApiKey: string | undefined, input: SendMailboxInput): Promise<SendMailboxResult>;
//# sourceMappingURL=send.d.ts.map