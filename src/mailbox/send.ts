/**
 * Outbound send: resolves the thread the message belongs to, emits the RFC 5322
 * threading headers so the recipient's client groups it correctly, sends through
 * Resend, then records the row in the sent table.
 */

import { parseEmailAddress } from "../core/index.js";
import { fromOptionById, type MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
import {
  fallbackThreadKey,
  generateOutboundMessageId,
  resolveConversationThreadKey,
  threadParticipants,
  type ThreadableMail,
} from "./threading.js";
import { sendOutboundEmail, type OutboundAttachment } from "./resend-client.js";

export type SendMailboxInput = {
  fromOptionId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: OutboundAttachment[];
  /** Id of the inbound or sent row being replied to. */
  replyToMessageId?: string;
  /** Recorded on the sent row for audit. */
  sentByUserId?: string | null;
  sentByName?: string | null;
};

export type SendMailboxResult =
  | { ok: true; messageId: string | null; threadKey: string }
  | { ok: false; error: "missing_fields" | "attachments_too_large" | "resend_not_configured" | "resend_send_failed"; details?: string };

/** Splits a raw recipient field on commas, semicolons and newlines. */
export function splitRecipients(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,\n;]/)
    .map((part) => parseEmailAddress(part.trim()).address.toLowerCase())
    .filter(Boolean);
}

/** Loads the row being replied to, checking inbound first and then sent. */
async function loadReplyTarget(
  db: MailboxDb,
  config: MailboxConfig,
  replyToMessageId: string,
): Promise<ThreadableMail | null> {
  const inboundColumns =
    "id,message_id,thread_key,in_reply_to,references,from_address,to_addresses,cc_addresses,subject";
  const { data: inbound, error: inboundError } = await db
    .from(config.tables.inbound)
    .select(inboundColumns)
    .eq("id", replyToMessageId)
    .maybeSingle();
  if (inboundError) throw inboundError;
  if (inbound) return inbound as ThreadableMail;

  const { data: sent, error: sentError } = await db
    .from(config.tables.sent)
    .select(`${inboundColumns},bcc_addresses`)
    .eq("id", replyToMessageId)
    .maybeSingle();
  if (sentError) throw sentError;
  return (sent as ThreadableMail | null) ?? null;
}

export async function sendMailboxMessage(
  db: MailboxDb,
  config: MailboxConfig,
  resendApiKey: string | undefined,
  input: SendMailboxInput,
): Promise<SendMailboxResult> {
  const to = input.to;
  const cc = input.cc ?? [];
  const bcc = input.bcc ?? [];
  const subject = (input.subject ?? "").trim();
  const html = (input.html ?? "").trim();
  const text = (input.text ?? "").trim();
  const attachments = input.attachments ?? [];

  if (to.length === 0 || !subject || (!html && !text)) return { ok: false, error: "missing_fields" };

  const attachmentBytes = attachments.reduce((sum, attachment) => sum + Math.max(0, attachment.size ?? 0), 0);
  if (attachmentBytes > config.maxAttachmentBytes) return { ok: false, error: "attachments_too_large" };

  if (!resendApiKey) return { ok: false, error: "resend_not_configured" };

  const fromOption = fromOptionById(config, input.fromOptionId);
  const emailHtml = html || text.replace(/\n/g, "<br>");
  const replyToMessageId = (input.replyToMessageId ?? "").trim();
  const replyToMessage = replyToMessageId ? await loadReplyTarget(db, config, replyToMessageId) : null;

  const parsedFrom = parseEmailAddress(fromOption.from);
  const outboundMessageId = generateOutboundMessageId(config.ordinaryDomain);
  const replyMessageId = replyToMessage?.message_id ?? null;
  const replyReferences = Array.from(
    new Set([...(replyToMessage?.references ?? []), ...(replyMessageId ? [replyMessageId] : [])]),
  );

  const threadKey =
    replyToMessage?.thread_key ??
    (await resolveConversationThreadKey(
      db,
      config,
      replyReferences.length > 0 ? replyReferences : replyMessageId ? [replyMessageId] : [outboundMessageId],
      fallbackThreadKey({
        subject,
        addresses: [
          parsedFrom.address,
          ...to,
          ...cc,
          ...bcc,
          ...(replyToMessage ? threadParticipants(replyToMessage) : []),
        ],
        noSubjectLabel: config.noSubjectLabel,
      }),
    ));

  const sent = await sendOutboundEmail(resendApiKey, {
    from: fromOption.from,
    to,
    cc,
    bcc,
    subject,
    html: emailHtml,
    attachments,
    messageId: outboundMessageId,
    inReplyTo: replyMessageId,
    references: replyReferences,
  });

  if (!sent.ok) {
    console.error("[mailbox/send] resend failed", sent.details);
    return { ok: false, error: "resend_send_failed", details: sent.details };
  }

  const { error } = await db.from(config.tables.sent).insert({
    resend_message_id: sent.messageId,
    message_id: outboundMessageId,
    thread_key: threadKey,
    in_reply_to: replyMessageId,
    references: replyReferences,
    from_address: parsedFrom.address,
    from_name: parsedFrom.name,
    to_addresses: to,
    cc_addresses: cc,
    bcc_addresses: bcc,
    subject,
    html_body: emailHtml,
    text_body: text || null,
    // The base64 payload is dropped: the row keeps only attachment metadata.
    attachments: attachments.map(({ content: _content, ...attachment }) => attachment),
    brand: fromOption.brand,
    sent_by_user_id: input.sentByUserId ?? null,
    sent_by_name: input.sentByName ?? null,
    status: "sent",
  });
  if (error) throw error;

  return { ok: true, messageId: sent.messageId, threadKey };
}
