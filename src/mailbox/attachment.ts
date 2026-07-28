/**
 * Resolves a download URL for an inbound attachment.
 *
 * Resend's links are signed and expire, so the stored one is reused while fresh
 * and re-signed through the API otherwise — the refreshed metadata is written
 * back so the next request hits the cheap path.
 */

import type { MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
import { attachmentIsFresh, retrieveReceivedAttachment, type ResendAttachment } from "./resend-client.js";

export type ResolveAttachmentResult =
  | { ok: true; downloadUrl: string }
  | { ok: false; error: "message_not_found" | "attachment_not_found" | "resend_not_configured" | "attachment_fetch_failed" };

export async function resolveAttachmentDownloadUrl(
  db: MailboxDb,
  config: MailboxConfig,
  resendApiKey: string | undefined,
  input: { messageId: string; attachmentId: string },
): Promise<ResolveAttachmentResult> {
  const { data: message, error } = await db
    .from(config.tables.inbound)
    .select("id,resend_email_id,attachments")
    .eq("id", input.messageId)
    .maybeSingle();
  if (error) throw error;

  const resendEmailId = message?.resend_email_id as string | undefined;
  if (!resendEmailId) return { ok: false, error: "message_not_found" };

  const attachments = Array.isArray(message?.attachments) ? (message.attachments as ResendAttachment[]) : [];
  const stored = attachments.find((attachment) => attachment.id === input.attachmentId);
  if (stored && attachmentIsFresh(stored)) {
    return { ok: true, downloadUrl: stored.download_url as string };
  }

  if (!resendApiKey) return { ok: false, error: "resend_not_configured" };

  const refreshed = await retrieveReceivedAttachment(resendApiKey, resendEmailId, input.attachmentId);
  if (!refreshed) return { ok: false, error: "attachment_fetch_failed" };
  if (!refreshed.download_url) return { ok: false, error: "attachment_not_found" };

  const nextAttachments = attachments.map((item) =>
    item.id === input.attachmentId ? { ...item, ...refreshed } : item,
  );
  await db.from(config.tables.inbound).update({ attachments: nextAttachments }).eq("id", input.messageId);

  return { ok: true, downloadUrl: refreshed.download_url };
}
