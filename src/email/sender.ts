import { findTenantById } from "../server/runtime";
import type { TenantVertical } from "../server/runtime";

// ─── Brand configs ─────────────────────────────────────────────────────────────

export type EmailBrand = {
  name: string;
  domain: string;
  fromEmail: string;
  primary: string;
  bg: string;
  text: string;
  muted: string;
};

export const PLATFORM_BRANDS: Record<TenantVertical, EmailBrand> = {
  food: {
    name: "Menuary",
    domain: "menuary.it",
    fromEmail: "amministrazione@menuary.it",
    primary: "#B8332E",
    bg: "#FFF4E6",
    text: "#141010",
    muted: "#7A6060",
  },
  services: {
    name: "Bizery",
    domain: "bizery.it",
    fromEmail: "amministrazione@bizery.it",
    primary: "#2563EB",
    bg: "#F0F5FF",
    text: "#0F172A",
    muted: "#64748B",
  },
  creative: {
    name: "Orpheo",
    domain: "weuseorpheo.com",
    fromEmail: "amministrazione@weuseorpheo.com",
    primary: "#7C3AED",
    bg: "#FBFAF7",
    text: "#17111F",
    muted: "#6B5E75",
  },
};

// ─── Sender resolution ────────────────────────────────────────────────────────

export type ResolvedSender = {
  from: string;       // "Brand Name <email@domain.com>"
  replyTo?: string;
  brand: EmailBrand;
};

export function resolveSenderForVertical(vertical: TenantVertical): ResolvedSender {
  const brand = PLATFORM_BRANDS[vertical];
  return {
    from: `${brand.name} <${brand.fromEmail}>`,
    brand,
  };
}

/**
 * Risolve mittente e brand per un'email.
 *
 * Se viene passato un tenantId, usa il suo verticale per scegliere il brand
 * della piattaforma (Menuary o Bizery).
 *
 * Futura espansione: se il tenant ha un `emailDomain` verificato su Resend,
 * usare quello come mittente personalizzato (es. info@loro-dominio.it).
 * Aggiungere `emailDomain?: string` a TenantProfile e gestirlo qui.
 */
export function resolveSender(tenantId?: string): ResolvedSender {
  let vertical: TenantVertical = "food";

  if (tenantId) {
    const tenant = findTenantById(tenantId);
    if (tenant?.vertical) vertical = tenant.vertical;
  }

  return resolveSenderForVertical(vertical);
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export type EmailAttachment = {
  filename: string;
  /** Contenuto base64 (senza prefisso data:). */
  content: string;
  /** Optional MIME hint — Resend lo inferisce dall'estensione. */
  contentType?: string;
};

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  tenantId?: string;
  /** Sovrascrive il mittente risolto automaticamente (solo per siteadmin). */
  fromOverride?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY non configurata." };

  const { from, replyTo } = resolveSender(params.tenantId);

  const attachments = params.attachments?.length
    ? params.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        ...(a.contentType ? { content_type: a.contentType } : {}),
      }))
    : undefined;

  const body = {
    from: params.fromOverride ?? from,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
    ...(params.replyTo ?? replyTo ? { reply_to: params.replyTo ?? replyTo } : {}),
    ...(attachments ? { attachments } : {}),
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, messageId: data.id ?? "" };
}
