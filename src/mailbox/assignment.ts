/**
 * Routes an inbound message to a specific admin by matching the recipient's
 * local part against a table of admin aliases.
 *
 * Unique match → assign and notify only that admin. Several matches or none →
 * leave unassigned and notify every admin, so no message is silently dropped.
 */

import { isOwnMailbox, localPart } from "./address.js";
import type { MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";

export type MailAssignmentReason = "alias_match" | "fallback_all_admins" | "ambiguous_alias";

export type MailAssignment = {
  assignedProfileId: string | null;
  notifyProfileIds: string[];
  reason: MailAssignmentReason;
};

type AdminProfileRow = { id: string; email: string; name: string | null };
type AliasRow = { profile_id: string; alias: string };
type UserRoleRow = { user_id: string };

/**
 * Loads admin profile ids.
 *
 * Two queries on purpose: `user_roles` declares no FK to `profiles`, so a
 * PostgREST embed (`user_roles -> profiles`) is not available here.
 */
async function loadAdminIds(db: MailboxDb, config: MailboxConfig): Promise<string[]> {
  const { data, error } = await db
    .from(config.tables.userRoles)
    .select("user_id")
    .eq("role", config.adminRole);
  if (error) throw error;
  return Array.from(new Set(((data ?? []) as UserRoleRow[]).map((row) => row.user_id).filter(Boolean)));
}

export async function resolveMailAssignment(
  db: MailboxDb,
  config: MailboxConfig,
  toAddresses: string[],
): Promise<MailAssignment> {
  if (config.refreshAliasesRpc) {
    const { error: refreshError } = await db.rpc(config.refreshAliasesRpc);
    if (refreshError) {
      console.warn("[mailbox] unable to refresh admin aliases", refreshError.message);
    }
  }

  const adminIds = await loadAdminIds(db, config);
  const { data: adminProfiles, error: profileError } = adminIds.length
    ? await db.from(config.tables.profiles).select("id,email,name").in("id", adminIds)
    : { data: [], error: null };

  if (profileError) throw profileError;

  const allAdminIds = ((adminProfiles ?? []) as AdminProfileRow[]).map((admin) => admin.id);

  const candidateAliases = Array.from(
    new Set(toAddresses.filter((address) => isOwnMailbox(config, address)).map(localPart).filter(Boolean)),
  );
  if (candidateAliases.length === 0 || allAdminIds.length === 0) {
    return { assignedProfileId: null, notifyProfileIds: allAdminIds, reason: "fallback_all_admins" };
  }

  const { data: aliasRows, error: aliasError } = await db
    .from(config.tables.adminAliases)
    .select("profile_id, alias")
    .in("alias", candidateAliases);

  if (aliasError) throw aliasError;

  const matchedProfileIds = Array.from(new Set(((aliasRows ?? []) as AliasRow[]).map((row) => row.profile_id)));

  if (matchedProfileIds.length === 1) {
    return {
      assignedProfileId: matchedProfileIds[0],
      notifyProfileIds: matchedProfileIds,
      reason: "alias_match",
    };
  }

  if (matchedProfileIds.length > 1) {
    return { assignedProfileId: null, notifyProfileIds: allAdminIds, reason: "ambiguous_alias" };
  }

  return { assignedProfileId: null, notifyProfileIds: allAdminIds, reason: "fallback_all_admins" };
}

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
export async function resolveMailPushRevocationProfileIds(
  db: MailboxDb,
  config: MailboxConfig,
  message: RevocableMailRow,
): Promise<string[]> {
  if (message.assignment_reason === "alias_match" && message.assigned_to_profile_id) {
    return [message.assigned_to_profile_id];
  }
  return loadAdminIds(db, config);
}
