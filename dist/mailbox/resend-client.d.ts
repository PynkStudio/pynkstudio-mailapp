/**
 * Resend HTTP calls used by the mailbox: retrieving a received message's full
 * content, refreshing an expiring attachment link, and sending outbound mail
 * with threading headers.
 */
import type { MailHeader } from "./message-id.js";
export type ReceivedEmailContent = {
    id?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    html?: string | null;
    text?: string | null;
    headers?: Record<string, unknown> | Array<{
        name?: unknown;
        value?: unknown;
    }>;
    attachments?: unknown[];
    message_id?: string;
};
export type ResendAttachment = {
    id?: string;
    filename?: string;
    content_type?: string;
    size?: number;
    download_url?: string;
    expires_at?: string;
    [key: string]: unknown;
};
/**
 * Fetches the stored body/headers/attachments of a received message.
 *
 * The inbound webhook payload does not include the body, so this call is what
 * turns an `email.received` event into a readable message. Returns null on any
 * failure — callers persist whatever the webhook payload carried instead.
 */
export declare function retrieveReceivedEmailContent(apiKey: string | undefined, emailId: string, options?: {
    logPrefix?: string;
}): Promise<ReceivedEmailContent | null>;
/** Re-signs a single inbound attachment, returning its fresh download URL. */
export declare function retrieveReceivedAttachment(apiKey: string, emailId: string, attachmentId: string): Promise<ResendAttachment | null>;
/** True when a stored link is still usable, with a minute of headroom. */
export declare function attachmentIsFresh(attachment: ResendAttachment): boolean;
export type OutboundAttachment = {
    filename: string;
    /** base64, no `data:` prefix. */
    content: string;
    contentType?: string;
    size?: number;
};
export type SendOutboundInput = {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    text?: string | null;
    attachments?: OutboundAttachment[];
    /** Bare ids (no angle brackets); this function adds them. */
    messageId?: string | null;
    inReplyTo?: string | null;
    references?: string[];
    extraHeaders?: MailHeader[];
};
export type SendOutboundResult = {
    ok: true;
    messageId: string | null;
} | {
    ok: false;
    details: string;
};
/** Sends a message through Resend, emitting RFC 5322 threading headers. */
export declare function sendOutboundEmail(apiKey: string, input: SendOutboundInput): Promise<SendOutboundResult>;
//# sourceMappingURL=resend-client.d.ts.map