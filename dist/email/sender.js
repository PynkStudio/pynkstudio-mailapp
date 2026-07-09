import { findTenantById } from "../server/runtime";
export const PLATFORM_BRANDS = {
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
export function resolveSenderForVertical(vertical) {
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
export function resolveSender(tenantId) {
    let vertical = "food";
    if (tenantId) {
        const tenant = findTenantById(tenantId);
        if (tenant?.vertical)
            vertical = tenant.vertical;
    }
    return resolveSenderForVertical(vertical);
}
export async function sendEmail(params) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey)
        return { ok: false, error: "RESEND_API_KEY non configurata." };
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
    const data = (await res.json());
    return { ok: true, messageId: data.id ?? "" };
}
//# sourceMappingURL=sender.js.map