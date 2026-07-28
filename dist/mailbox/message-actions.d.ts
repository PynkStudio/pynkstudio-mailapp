/**
 * Read/star/archive/spam/delete on an inbound message.
 *
 * Marking a message read, archived, spam or deleted also withdraws its push
 * notification, so admins who were notified do not keep a stale alert.
 * Spam additionally records/clears the sender in the spam table, which is what
 * makes later messages from that address land in spam on arrival.
 */
import type { MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
import { type MailPushOptions, type PushSender } from "./push.js";
export type MailMessageAction = "read" | "unread" | "star" | "unstar" | "archive" | "restore" | "spam" | "not_spam" | "delete";
export declare function isMailMessageAction(value: unknown): value is MailMessageAction;
export type ApplyMessageActionOptions = {
    push?: {
        send: PushSender;
        options?: MailPushOptions;
    };
};
export declare function applyMailMessageAction(db: MailboxDb, config: MailboxConfig, id: string, action: MailMessageAction, options?: ApplyMessageActionOptions): Promise<void>;
//# sourceMappingURL=message-actions.d.ts.map