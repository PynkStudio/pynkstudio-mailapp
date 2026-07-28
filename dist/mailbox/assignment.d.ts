/**
 * Routes an inbound message to a specific admin by matching the recipient's
 * local part against a table of admin aliases.
 *
 * Unique match → assign and notify only that admin. Several matches or none →
 * leave unassigned and notify every admin, so no message is silently dropped.
 */
import type { MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
export type MailAssignmentReason = "alias_match" | "fallback_all_admins" | "ambiguous_alias";
export type MailAssignment = {
    assignedProfileId: string | null;
    notifyProfileIds: string[];
    reason: MailAssignmentReason;
};
export declare function resolveMailAssignment(db: MailboxDb, config: MailboxConfig, toAddresses: string[]): Promise<MailAssignment>;
export type RevocableMailRow = {
    id: string;
    assigned_to_profile_id?: string | null;
    assignment_reason?: string | null;
    push_notified_at?: string | null;
};
/**
 * Who was notified about a message, and therefore whose notification must be
 * withdrawn when it is read: the assignee alone if it was routed by alias,
 * otherwise every admin.
 */
export declare function resolveMailPushRevocationProfileIds(db: MailboxDb, config: MailboxConfig, message: RevocableMailRow): Promise<string[]>;
//# sourceMappingURL=assignment.d.ts.map