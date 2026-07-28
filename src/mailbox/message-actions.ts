/**
 * Read/star/archive/spam/delete on an inbound message.
 *
 * Marking a message read, archived, spam or deleted also withdraws its push
 * notification, so admins who were notified do not keep a stale alert.
 * Spam additionally records/clears the sender in the spam table, which is what
 * makes later messages from that address land in spam on arrival.
 */

import { normalizeAddress } from "./address.js";
import type { MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
import { revokeMailPushNotification, type MailPushOptions, type PushSender } from "./push.js";

export type MailMessageAction =
  | "read"
  | "unread"
  | "star"
  | "unstar"
  | "archive"
  | "restore"
  | "spam"
  | "not_spam"
  | "delete";

const MAIL_MESSAGE_ACTIONS: readonly MailMessageAction[] = [
  "read",
  "unread",
  "star",
  "unstar",
  "archive",
  "restore",
  "spam",
  "not_spam",
  "delete",
];

export function isMailMessageAction(value: unknown): value is MailMessageAction {
  return typeof value === "string" && (MAIL_MESSAGE_ACTIONS as readonly string[]).includes(value);
}

function revokesPush(action: MailMessageAction): boolean {
  return action === "read" || action === "archive" || action === "spam" || action === "delete";
}

export type ApplyMessageActionOptions = {
  push?: { send: PushSender; options?: MailPushOptions };
};

async function revokePushIfNeeded(
  db: MailboxDb,
  config: MailboxConfig,
  id: string,
  action: MailMessageAction,
  options: ApplyMessageActionOptions,
): Promise<void> {
  if (!options.push || !revokesPush(action)) return;

  const { data: message, error } = await db
    .from(config.tables.inbound)
    .select("id, assigned_to_profile_id, assignment_reason, push_notified_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!message) return;

  await revokeMailPushNotification(db, config, options.push.send, message, options.push.options).catch(
    (pushError) => {
      console.error("[mailbox/message] push revocation failed", pushError);
    },
  );
}

export async function applyMailMessageAction(
  db: MailboxDb,
  config: MailboxConfig,
  id: string,
  action: MailMessageAction,
  options: ApplyMessageActionOptions = {},
): Promise<void> {
  const inbound = config.tables.inbound;

  if (action === "delete") {
    // Revoked before the row disappears: revocation needs its assignment data.
    await revokePushIfNeeded(db, config, id, action, options);
    const { error } = await db.from(inbound).delete().eq("id", id);
    if (error) throw error;
    return;
  }

  if (action === "spam" || action === "not_spam") {
    const isSpam = action === "spam";
    const { data: email } = await db.from(inbound).select("from_address").eq("id", id).maybeSingle();
    const { error } = await db
      .from(inbound)
      .update(isSpam ? { spam: true, read: true } : { spam: false })
      .eq("id", id);
    if (error) throw error;

    if (isSpam) await revokePushIfNeeded(db, config, id, action, options);

    const fromAddress = email?.from_address as string | undefined;
    if (fromAddress) {
      const address = normalizeAddress(fromAddress);
      if (isSpam) {
        await db.from(config.tables.spamSenders).upsert({ address }, { onConflict: "address" });
      } else {
        await db.from(config.tables.spamSenders).delete().eq("address", address);
      }
    }
    return;
  }

  const patch =
    action === "read"
      ? { read: true }
      : action === "unread"
        ? { read: false }
        : action === "star"
          ? { starred: true }
          : action === "unstar"
            ? { starred: false }
            : action === "archive"
              ? { archived: true, read: true }
              : { archived: false };

  const { error } = await db.from(inbound).update(patch).eq("id", id);
  if (error) throw error;
  await revokePushIfNeeded(db, config, id, action, options);
}
