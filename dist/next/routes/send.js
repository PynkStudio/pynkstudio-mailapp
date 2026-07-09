import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "../../server/runtime";
import { createSupabaseAdminClient } from "../../server/runtime";
import { createSupabaseServiceClient } from "../../server/runtime";
import { sendEmail } from "../../email/sender";
import { buildMarketingEmail } from "../../email/templates/marketing";
import { resolveSender } from "../../email/sender";
import { parseEmailAddress } from "../../email/inbound-types";
import { detectBrandFromSender } from "../../email/tracking-types";
import { findTenantById } from "../../server/runtime";
import { resolveSessionCookieDomain } from "../../server/runtime";
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB per file (limite Resend ~10MB totale)
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20 MB totali (margine per multi-allegati)
export async function POST(request) {
    const host = (await headers()).get("host");
    const supabase = await createSupabaseServerClient(resolveSessionCookieDomain(host));
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }
    let body;
    try {
        body = (await request.json());
    }
    catch {
        return NextResponse.json({ error: "Body non valido." }, { status: 400 });
    }
    const { to, subject, tenantId, html, template, replyTo, fromOverride, attachments } = body;
    if (!to || !subject) {
        return NextResponse.json({ error: "to e subject sono richiesti." }, { status: 400 });
    }
    if (!html && !template) {
        return NextResponse.json({ error: "Fornire html oppure template." }, { status: 400 });
    }
    let safeAttachments;
    if (attachments?.length) {
        let totalBytes = 0;
        safeAttachments = [];
        for (const a of attachments) {
            if (!a?.filename || !a?.content) {
                return NextResponse.json({ error: "Allegato malformato: filename e content sono obbligatori." }, { status: 400 });
            }
            const bytes = Math.ceil((a.content.length * 3) / 4);
            if (bytes > MAX_ATTACHMENT_BYTES) {
                return NextResponse.json({ error: `Allegato "${a.filename}" supera 8 MB.` }, { status: 413 });
            }
            totalBytes += bytes;
            safeAttachments.push({
                filename: a.filename,
                content: a.content,
                contentType: a.contentType,
            });
        }
        if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
            return NextResponse.json({ error: "Dimensione totale degli allegati superiore a 20 MB." }, { status: 413 });
        }
    }
    // ── Autorizzazione ──────────────────────────────────────────────────────────
    const adminClient = createSupabaseAdminClient();
    const [{ data: sa }, { data: ta }] = await Promise.all([
        adminClient.from("siteadmin").select("id").eq("user_id", user.id).eq("enabled", true).maybeSingle(),
        tenantId
            ? adminClient
                .from("tenantadmin")
                .select("id")
                .eq("user_id", user.id)
                .eq("tenant_id", tenantId)
                .eq("enabled", true)
                .maybeSingle()
            : Promise.resolve({ data: null }),
    ]);
    const isSiteAdmin = !!sa;
    const isTenantAdmin = !!ta;
    if (!isSiteAdmin && !isTenantAdmin) {
        return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    }
    const tenant = tenantId ? findTenantById(tenantId) : null;
    const fromOverrideAddress = fromOverride ? parseEmailAddress(fromOverride).address.toLowerCase() : null;
    const fromOverrideDomain = fromOverrideAddress?.split("@")[1] ?? null;
    const tenantCanUseFromOverride = Boolean(isTenantAdmin &&
        tenant &&
        fromOverrideDomain &&
        (tenant.domains ?? []).some((domain) => domain.toLowerCase() === fromOverrideDomain));
    if (fromOverride && !isSiteAdmin && !tenantCanUseFromOverride) {
        return NextResponse.json({ error: "Mittente non autorizzato per questo tenant." }, { status: 403 });
    }
    // ── Costruzione HTML ────────────────────────────────────────────────────────
    let emailHtml;
    if (html) {
        emailHtml = html;
    }
    else {
        const { brand } = resolveSender(tenantId);
        emailHtml = buildMarketingEmail({ brand, ...template });
    }
    // ── Invio ───────────────────────────────────────────────────────────────────
    const resolvedSender = resolveSender(tenantId);
    const effectiveFrom = (isSiteAdmin || tenantCanUseFromOverride ? fromOverride : undefined) ?? resolvedSender.from;
    const result = await sendEmail({
        to,
        subject,
        html: emailHtml,
        tenantId,
        replyTo,
        fromOverride: isSiteAdmin || tenantCanUseFromOverride ? fromOverride : undefined,
        attachments: safeAttachments,
    });
    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 });
    }
    // ── Salva in sent_emails (best-effort, non blocca la risposta) ──────────────
    const svc = createSupabaseServiceClient();
    if (svc && result.messageId) {
        const toList = Array.isArray(to) ? to : [to];
        const { name: fromName, address: fromAddress } = parseEmailAddress(effectiveFrom);
        const brand = detectBrandFromSender(fromAddress);
        void svc.from("sent_emails").insert({
            resend_message_id: result.messageId,
            from_address: fromAddress,
            from_name: fromName,
            to_addresses: toList,
            subject,
            html_body: emailHtml,
            brand,
            tenant_id: tenantId ?? null,
            sent_by_user_id: user.id,
        });
    }
    return NextResponse.json({ ok: true, messageId: result.messageId });
}
//# sourceMappingURL=send.js.map