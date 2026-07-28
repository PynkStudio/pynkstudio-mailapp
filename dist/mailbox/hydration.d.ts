/**
 * Fills in what the list query cannot return on its own: assignee profiles,
 * bodies for legacy rows stored before the webhook fetched them, and the full
 * conversation behind each thread key.
 */
import type { MailboxConfig } from "./config.js";
import type { InboundMailRow, MailboxDb } from "./db.js";
export type ThreadMailMessage = {
    id: string;
    created_at: string;
    thread_key?: string | null;
    assigned_to_profile_id?: string | null;
    source?: "inbound" | "sent";
    thread_messages?: ThreadMailMessage[];
    [key: string]: unknown;
};
/** Attaches the assignee profile to each inbound row that names one. */
export declare function hydrateInboundAssignments<T extends InboundMailRow>(db: MailboxDb, config: MailboxConfig, messages: T[]): Promise<T[]>;
/**
 * Backfills bodies for rows saved before the webhook started retrieving content
 * from Resend. Only touches rows that have no body but do carry a Resend id, and
 * persists what it finds so the fetch happens once.
 */
export declare function hydrateMissingInboundBodies<T extends InboundMailRow>(db: MailboxDb, config: MailboxConfig, messages: T[], apiKey: string | undefined): Promise<T[]>;
/**
 * Attaches the full conversation to each message, merging inbound and sent rows
 * that share a thread key into one chronological list.
 */
export declare function attachThreadMessages<T extends ThreadMailMessage>(db: MailboxDb, config: MailboxConfig, messages: T[]): Promise<T[]>;
//# sourceMappingURL=hydration.d.ts.map