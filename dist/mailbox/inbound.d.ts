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
import type { MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
import type { MailPushOptions, PushSender } from "./push.js";
export type ResendWebhookPayload = {
    type?: string;
    data?: Record<string, unknown>;
    [key: string]: unknown;
};
export type InboundEventResult = {
    kind: "received";
    id: string | null;
    pushSent: boolean;
} | {
    kind: "tracking";
    status: string | null;
} | {
    kind: "ignored";
} | {
    kind: "error";
    error: "missing_from_to";
};
export declare function eventToSentStatus(type: string): string | null;
export declare function resendEmailIdOf(data: Record<string, unknown>): string;
export type HandleInboundOptions = {
    resendApiKey?: string;
    /** Omit to skip push entirely. */
    push?: {
        send: PushSender;
        options?: MailPushOptions;
        title: (assigned: boolean) => string;
    };
};
export declare function handleResendWebhookEvent(db: MailboxDb, config: MailboxConfig, payload: ResendWebhookPayload, options?: HandleInboundOptions): Promise<InboundEventResult>;
//# sourceMappingURL=inbound.d.ts.map