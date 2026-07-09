import type { TenantVertical } from "../server/runtime";
export type EmailBrand = {
    name: string;
    domain: string;
    fromEmail: string;
    primary: string;
    bg: string;
    text: string;
    muted: string;
};
export declare const PLATFORM_BRANDS: Record<TenantVertical, EmailBrand>;
export type ResolvedSender = {
    from: string;
    replyTo?: string;
    brand: EmailBrand;
};
export declare function resolveSenderForVertical(vertical: TenantVertical): ResolvedSender;
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
export declare function resolveSender(tenantId?: string): ResolvedSender;
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
export type SendEmailResult = {
    ok: true;
    messageId: string;
} | {
    ok: false;
    error: string;
};
export declare function sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
//# sourceMappingURL=sender.d.ts.map