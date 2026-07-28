/**
 * Resend HTTP calls used by the mailbox: retrieving a received message's full
 * content, refreshing an expiring attachment link, and sending outbound mail
 * with threading headers.
 */

import type { MailHeader } from "./message-id.js";

const RESEND_API = "https://api.resend.com";

export type ReceivedEmailContent = {
  id?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, unknown> | Array<{ name?: unknown; value?: unknown }>;
  attachments?: unknown[];
  message_id?: string;
};

export type ResendAttachment = {
  id?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  download_url?: string;
  expires_at?: string;
  [key: string]: unknown;
};

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

/**
 * Fetches the stored body/headers/attachments of a received message.
 *
 * The inbound webhook payload does not include the body, so this call is what
 * turns an `email.received` event into a readable message. Returns null on any
 * failure — callers persist whatever the webhook payload carried instead.
 */
export async function retrieveReceivedEmailContent(
  apiKey: string | undefined,
  emailId: string,
  options: { logPrefix?: string } = {},
): Promise<ReceivedEmailContent | null> {
  if (!apiKey || !emailId) return null;

  const response = await fetch(
    `${RESEND_API}/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`,
    { headers: authHeaders(apiKey) },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error(`${options.logPrefix ?? "[mailbox]"} received email fetch failed`, response.status, details);
    return null;
  }

  return (await response.json()) as ReceivedEmailContent;
}

/** Re-signs a single inbound attachment, returning its fresh download URL. */
export async function retrieveReceivedAttachment(
  apiKey: string,
  emailId: string,
  attachmentId: string,
): Promise<ResendAttachment | null> {
  const response = await fetch(
    `${RESEND_API}/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { headers: authHeaders(apiKey) },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("[mailbox] attachment fetch failed", response.status, details);
    return null;
  }

  return (await response.json()) as ResendAttachment;
}

/** True when a stored link is still usable, with a minute of headroom. */
export function attachmentIsFresh(attachment: ResendAttachment): boolean {
  if (!attachment.download_url) return false;
  if (!attachment.expires_at) return true;
  return Date.parse(attachment.expires_at) > Date.now() + 60_000;
}

export type OutboundAttachment = {
  filename: string;
  /** base64, no `data:` prefix. */
  content: string;
  contentType?: string;
  size?: number;
};

export type SendOutboundInput = {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string | null;
  attachments?: OutboundAttachment[];
  /** Bare ids (no angle brackets); this function adds them. */
  messageId?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  extraHeaders?: MailHeader[];
};

export type SendOutboundResult = { ok: true; messageId: string | null } | { ok: false; details: string };

/** Sends a message through Resend, emitting RFC 5322 threading headers. */
export async function sendOutboundEmail(
  apiKey: string,
  input: SendOutboundInput,
): Promise<SendOutboundResult> {
  const headers: Record<string, string> = {};
  if (input.messageId) headers["Message-ID"] = `<${input.messageId}>`;
  if (input.inReplyTo) headers["In-Reply-To"] = `<${input.inReplyTo}>`;
  if (input.references?.length) headers.References = input.references.map((id) => `<${id}>`).join(" ");
  for (const header of input.extraHeaders ?? []) headers[header.name] = header.value;

  const response = await fetch(`${RESEND_API}/emails`, {
    method: "POST",
    headers: { ...authHeaders(apiKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      ...(input.cc?.length ? { cc: input.cc } : {}),
      ...(input.bcc?.length ? { bcc: input.bcc } : {}),
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(input.attachments?.length
        ? {
            attachments: input.attachments.map((attachment) => ({
              filename: attachment.filename,
              content: attachment.content,
              ...(attachment.contentType ? { content_type: attachment.contentType } : {}),
            })),
          }
        : {}),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    }),
  });

  if (!response.ok) {
    return { ok: false, details: await response.text().catch(() => "") };
  }

  const result = (await response.json()) as { id?: string };
  return { ok: true, messageId: result.id ?? null };
}
