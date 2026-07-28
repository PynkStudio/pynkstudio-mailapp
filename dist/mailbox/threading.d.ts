import type { MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
/** Server-only: depends on `node:crypto`. */
export type ThreadableMail = {
    id?: string | null;
    message_id?: string | null;
    thread_key?: string | null;
    in_reply_to?: string | null;
    references?: string[] | null;
    from_address?: string | null;
    to_addresses?: string[] | null;
    cc_addresses?: string[] | null;
    bcc_addresses?: string[] | null;
    subject?: string | null;
};
/**
 * Deterministic thread key for messages that carry no usable threading headers
 * (legacy rows, senders that strip References). Keyed on normalized subject plus
 * the sorted participant set.
 */
export declare function fallbackThreadKey(input: {
    subject: string;
    addresses: string[];
    noSubjectLabel?: string;
}): string;
export declare function generateOutboundMessageId(domain: string): string;
/**
 * Finds the thread an outbound/inbound message belongs to by looking up any of
 * its related message ids, falling back to `fallbackKey` when none is known.
 */
export declare function resolveConversationThreadKey(db: MailboxDb, config: MailboxConfig, relatedMessageIds: string[], fallbackKey: string): Promise<string>;
export declare function threadParticipants(message: ThreadableMail): string[];
//# sourceMappingURL=threading.d.ts.map