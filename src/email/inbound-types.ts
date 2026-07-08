// ─── Payload Resend Inbound ───────────────────────────────────────────────────
// Resend invia questo payload via POST al webhook quando riceve un'email
// sui domini configurati (menuary.it, bizery.it, weuseorpheo.com, pynkstudio.*).

export type ResendInboundHeader = {
  name: string;
  value: string;
};

export type ResendInboundAttachment = {
  id?: string;
  filename?: string;
  content_type?: string;
  content_disposition?: string | null;
  content_id?: string | null;
  size?: number;
  content?: string; // base64
  download_url?: string;
  expires_at?: string;
};

/** Payload grezzo del webhook Resend Inbound. */
export type ResendInboundPayload = {
  id?: string;
  email_id?: string;
  from: string;
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  headers?: ResendInboundHeader[] | Record<string, string>;
  attachments?: ResendInboundAttachment[];
  /** Resend può wrappare il payload in { type, data } */
  type?: string;
  data?: Omit<ResendInboundPayload, "type" | "data">;
};

// ─── Riga DB ──────────────────────────────────────────────────────────────────

export type InboundEmailBrand = "menuary" | "bizery" | "orpheo" | "pynkstudio";

export type InboundEmail = {
  id: string;
  created_at: string;
  message_id: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  subject: string;
  text_body: string | null;
  html_body: string | null;
  headers: ResendInboundHeader[];
  attachments: ResendInboundAttachment[];
  brand: InboundEmailBrand;
  tenant_id?: string | null;
  read: boolean;
  starred: boolean;
  archived: boolean;
  spam: boolean;
  lead_id: string | null;
  assigned_to_user_id: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Estrae nome e indirizzo da una stringa tipo "Mario Rossi <mario@esempio.it>".
 */
export function parseEmailAddress(raw: string): { name: string | null; address: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim() || null, address: match[2].trim() };
  return { name: null, address: raw.trim() };
}

/**
 * Determina il brand dalla lista di destinatari.
 * Priorità: orpheo > bizery > menuary > fallback menuary.
 */
export function detectBrandFromRecipients(toAddresses: string[]): InboundEmailBrand {
  const addresses = toAddresses.join(" ").toLowerCase();
  if (
    addresses.includes("@pynkstudio.it") ||
    addresses.includes("@pynkstudio.com") ||
    addresses.includes("@pynkstudio.eu")
  ) {
    return "pynkstudio";
  }
  if (addresses.includes("@weuseorpheo.com")) return "orpheo";
  if (addresses.includes("@bizery.it")) return "bizery";
  return "menuary";
}
