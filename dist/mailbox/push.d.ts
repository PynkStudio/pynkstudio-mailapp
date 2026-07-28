/**
 * Web Push delivery for mail notifications.
 *
 * The actual push transport is injected rather than imported, so the package
 * carries no `web-push` dependency and the host stays free to use any sender
 * (or none). The logic worth sharing lives here: resolving subscriptions for a
 * set of profiles, honouring the per-user opt-out, and pruning endpoints the
 * push service has retired.
 */
import type { MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
import { type RevocableMailRow } from "./assignment.js";
export type MailPushPayload = {
    title?: string;
    body?: string;
    url?: string;
    /** Tag the notification carries, so it can be withdrawn later. */
    tag?: string;
    /** Tag to close on the client, used by `mail-read`. */
    closeTag?: string;
    type?: "mail" | "mail-read";
};
export type PushSubscriptionTarget = {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
};
/**
 * Sends one notification. Reject with an error carrying `statusCode` (or
 * `status`) so 404/410 endpoints can be pruned — `web-push`'s
 * `sendNotification` already does exactly this.
 */
export type PushSender = (target: PushSubscriptionTarget, payload: string) => Promise<unknown>;
export type MailPushOptions = {
    /** Column in the preferences table gating mail push. Defaults to `push_mail_enabled`. */
    preferenceColumn?: string;
};
/**
 * Delivers `notification` to every enabled subscription of `profileIds` whose
 * owner has not disabled mail push. Returns true when at least one send landed.
 */
export declare function sendMailPushNotification(db: MailboxDb, config: MailboxConfig, send: PushSender, profileIds: string[], notification: MailPushPayload, options?: MailPushOptions): Promise<boolean>;
/**
 * Withdraws the notification for a message that has just been read/archived, so
 * other admins are not left holding a stale alert. No-op when nothing was sent.
 */
export declare function revokeMailPushNotification(db: MailboxDb, config: MailboxConfig, send: PushSender, message: RevocableMailRow, options?: MailPushOptions): Promise<boolean>;
//# sourceMappingURL=push.d.ts.map