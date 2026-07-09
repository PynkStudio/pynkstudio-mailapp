import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createSupabaseServiceClient } from "../../server/runtime";
import { sendWebPushToSiteadmin, sendWebPushToSubscriptions } from "../../server/runtime";
import { resolveTenantMailPushTargets } from "../../email/mail-device-filters";
import { parseEmailAddress, detectBrandFromRecipients, } from "../../email/inbound-types";
import { detectBrandFromSender, trackingEventToStatus, ALL_TRACKING_EVENTS, } from "../../email/tracking-types";
/**
 * POST /api/webhooks/email/inbound
 *
 * Gestisce due categorie di eventi Resend tramite lo stesso endpoint:
 *
 * 1. email.received  — email in arrivo su @menuary.it / @bizery.it / @weuseorpheo.com
 *    → salva in `inbound_emails`
 *
 * 2. email.sent | email.delivered | email.delivery_delayed |
 *    email.bounced | email.complained | email.opened | email.clicked
 *    → salva in `email_tracking_events`
 *    → aggiorna `status` in `sent_emails` per delivered/bounced/complained
 *
 * Configurazione Resend:
 *   Dashboard → Webhooks → stesso URL per tutti gli eventi:
 *     https://admin.menuary.it/api/webhooks/email/inbound
 *
 * ENV: RESEND_WEBHOOK_SECRET (whsec_...)
 */
// ─── Verifica firma svix ──────────────────────────────────────────────────────
function verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, secret) {
    try {
        const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
        const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
        const computed = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
        const signatures = svixSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
        return signatures.some((sig) => {
            try {
                return timingSafeEqual(Buffer.from(sig, "base64"), Buffer.from(computed, "base64"));
            }
            catch {
                return false;
            }
        });
    }
    catch {
        return false;
    }
}
// ─── Helpers inbound ─────────────────────────────────────────────────────────
function extractInboundPayload(obj) {
    if (obj.type === "email.received" && obj.data && typeof obj.data === "object") {
        return obj.data;
    }
    if (typeof obj.from === "string")
        return obj;
    return null;
}
function normalizeHeaders(raw) {
    if (!raw)
        return [];
    if (Array.isArray(raw))
        return raw;
    if (typeof raw === "object") {
        return Object.entries(raw).map(([name, value]) => ({ name, value }));
    }
    return [];
}
function extractMessageId(headers) {
    return headers.find((h) => h.name.toLowerCase() === "message-id")?.value ?? null;
}
function isSupportRecipient(toAddresses) {
    return toAddresses.some((address) => {
        const parsed = parseEmailAddress(address).address.toLowerCase();
        return parsed === "support@menuary.it" || parsed === "support@bizery.it" || parsed === "support@weuseorpheo.com";
    });
}
const SHARED_MENUARY_INBOX = "hello@menuary.it";
// ─── Auto-assign all'utente corrispondente ────────────────────────────────────
async function resolveEmailAssignment(toAddresses, svc) {
    const parsed = toAddresses
        .map((a) => parseEmailAddress(a).address.toLowerCase())
        .filter(Boolean);
    if (parsed.length === 0)
        return null;
    // 1. Match esatto sull'email dell'utente (massimo@menuary.it → siteadmin.email)
    const directRecipients = parsed.filter((address) => address !== SHARED_MENUARY_INBOX);
    const { data: exactUser } = await svc
        .from("siteadmin")
        .select("id,role")
        .in("email", directRecipients.length > 0 ? directRecipients : parsed)
        .eq("enabled", true)
        .limit(1)
        .maybeSingle();
    if (exactUser && exactUser.role !== "superadmin")
        return exactUser.id;
    if (parsed.includes(SHARED_MENUARY_INBOX)) {
        const { data: operativeAdmin } = await svc
            .from("siteadmin")
            .select("id")
            .in("role", ["admin", "amministrazione"])
            .eq("enabled", true)
            .order("role", { ascending: true })
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
        return operativeAdmin?.id ?? null;
    }
    // 2. Match sugli alias (parte locale dell'indirizzo: "massimo", "mpernozzoli", ecc.)
    const localParts = parsed.map((a) => a.split("@")[0]).filter(Boolean);
    if (localParts.length === 0)
        return null;
    const { data: aliasRow } = await svc
        .from("siteadmin_email_aliases")
        .select("siteadmin_id")
        .in("alias", localParts)
        .limit(1)
        .maybeSingle();
    if (!aliasRow)
        return null;
    // Verifica che l'utente sia ancora attivo
    const { data: activeUser } = await svc
        .from("siteadmin")
        .select("id")
        .eq("id", aliasRow.siteadmin_id)
        .eq("enabled", true)
        .maybeSingle();
    return activeUser?.id ?? null;
}
async function isBlockedSpamSender(fromAddress, tenantId, svc) {
    let query = svc
        .from("email_spam_senders")
        .select("id")
        .eq("address", fromAddress.trim().toLowerCase())
        .limit(1);
    // Blocco globale (tenant_id null) vale per tutti; blocco tenant vale solo per le sue email
    query = tenantId
        ? query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
        : query.is("tenant_id", null);
    const { data, error } = await query.maybeSingle();
    if (error) {
        console.error("[webhook:inbound] Errore lookup blocklist spam:", error.message);
        return false;
    }
    return Boolean(data);
}
async function resolveTenantIdFromRecipients(toAddresses, svc) {
    const recipientDomains = new Set(toAddresses
        .map((address) => parseEmailAddress(address).address.toLowerCase().split("@")[1])
        .filter(Boolean));
    if (recipientDomains.size === 0)
        return null;
    const { data } = await svc
        .from("tenants")
        .select("id, domains")
        .eq("enabled", true);
    const match = (data ?? []).find((tenant) => (tenant.domains ?? []).some((domain) => recipientDomains.has(domain.toLowerCase())));
    return match?.id ?? null;
}
async function fetchResendJson(path) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey)
        return null;
    const res = await fetch(`https://api.resend.com${path}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
        console.error("[webhook:inbound] Resend API error:", path, res.status, await res.text());
        return null;
    }
    return (await res.json());
}
async function fetchReceivedEmail(emailId) {
    if (!emailId)
        return null;
    return fetchResendJson(`/emails/receiving/${encodeURIComponent(emailId)}`);
}
async function fetchAttachmentContent(downloadUrl) {
    const res = await fetch(downloadUrl);
    if (!res.ok)
        return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.toString("base64");
}
async function fetchReceivedAttachments(emailId) {
    if (!emailId)
        return [];
    const list = await fetchResendJson(`/emails/receiving/${encodeURIComponent(emailId)}/attachments`);
    const attachments = list?.data ?? [];
    return Promise.all(attachments.map(async (attachment) => {
        if (!attachment.download_url)
            return attachment;
        const content = await fetchAttachmentContent(attachment.download_url).catch(() => null);
        return content ? { ...attachment, content } : attachment;
    }));
}
// Estrae il corpo HTML da un payload Resend, provando più varianti di campo.
// Resend ha usato nomi diversi nel tempo (html / html_body / body_html).
function extractHtmlBody(p) {
    const v = p.html ?? p.html_body ?? p.body_html ?? p.body ?? null;
    if (typeof v === "string" && v.trim())
        return v;
    return null;
}
function extractTextBody(p) {
    const v = p.text ?? p.text_body ?? p.body_text ?? p.plain ?? p.plain_text ?? null;
    if (typeof v === "string" && v.trim())
        return v;
    return null;
}
async function handleInbound(payload, svc) {
    const raw = payload;
    const resendEmailId = (typeof raw.email_id === "string" && raw.email_id) ||
        (typeof raw.id === "string" && raw.id) ||
        null;
    const receivedEmail = await fetchReceivedEmail(resendEmailId);
    const source = receivedEmail ? { ...raw, ...receivedEmail } : raw;
    const from = typeof source.from === "string" ? source.from : payload.from;
    const rawTo = source.to ?? payload.to;
    const toAddresses = Array.isArray(rawTo) ? rawTo.filter(Boolean) : [rawTo].filter(Boolean);
    if (!from || toAddresses.length === 0) {
        return NextResponse.json({ error: "Campi from/to mancanti." }, { status: 400 });
    }
    const brand = detectBrandFromRecipients(toAddresses);
    const tenantId = await resolveTenantIdFromRecipients(toAddresses, svc);
    const assignedToUserId = await resolveEmailAssignment(toAddresses, svc);
    const { name: fromName, address: fromAddress } = parseEmailAddress(from);
    const isSpam = await isBlockedSpamSender(fromAddress, tenantId, svc);
    const headers = normalizeHeaders(source.headers);
    const messageId = (typeof source.message_id === "string" && source.message_id) || extractMessageId(headers);
    const htmlBody = extractHtmlBody(source);
    const textBody = extractTextBody(source);
    const attachments = resendEmailId
        ? await fetchReceivedAttachments(resendEmailId)
        : (payload.attachments ?? []);
    const subjectLine = (typeof source.subject === "string" ? source.subject : payload.subject) ?? "(nessun oggetto)";
    const { data: inboundRow, error } = await svc.from("inbound_emails").insert({
        message_id: messageId,
        from_address: fromAddress,
        from_name: fromName,
        to_addresses: toAddresses,
        subject: subjectLine,
        text_body: textBody,
        html_body: htmlBody,
        headers: headers,
        attachments: attachments,
        brand,
        tenant_id: tenantId,
        assigned_to_user_id: isSpam ? null : assignedToUserId,
        spam: isSpam,
    }).select("id").single();
    if (error) {
        console.error("[webhook:inbound] Errore inserimento:", error.message);
        return NextResponse.json({ error: "Errore salvataggio." }, { status: 500 });
    }
    if (!isSpam && assignedToUserId) {
        await sendWebPushToSiteadmin(assignedToUserId, {
            title: "Nuova mail assegnata",
            body: `${fromName ?? fromAddress}: ${subjectLine}`,
            url: "/admin/inbox",
            tag: `admin-inbox-${inboundRow?.id ?? messageId ?? Date.now()}`,
        }).catch((err) => console.warn("[webhook:inbound] push fallita:", err));
    }
    if (!isSpam && tenantId) {
        const targetIds = await resolveTenantMailPushTargets(tenantId, toAddresses).catch((err) => {
            console.warn("[webhook:inbound] resolveTenantMailPushTargets fallita:", err);
            return [];
        });
        if (targetIds.length) {
            // Nessun url esplicito: ogni dispositivo apre la pagina da cui si è
            // iscritto (page_url salvata al subscribe), coerente coi vari domini
            // gestione possibili per tenant.
            await sendWebPushToSubscriptions(targetIds, {
                title: "Nuova mail",
                body: `${fromName ?? fromAddress}: ${subjectLine}`,
                tag: `tenant-mail-${inboundRow?.id ?? messageId ?? Date.now()}`,
            }).catch((err) => console.warn("[webhook:inbound] push tenant fallita:", err));
        }
    }
    if (!isSpam && isSupportRecipient(toAddresses)) {
        const { data: ticket, error: ticketError } = await svc.from("support_tickets").insert({
            source: "email",
            requester_email: fromAddress,
            requester_name: fromName,
            subject: (typeof source.subject === "string" ? source.subject : payload.subject) ?? "(nessun oggetto)",
            body: textBody || htmlBody?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "",
            status: "open",
            priority: "normal",
            metadata: {
                inboundEmailId: inboundRow?.id ?? null,
                messageId,
                toAddresses,
                brand,
            },
        }).select("id").single();
        if (ticketError || !ticket) {
            console.error("[webhook:inbound] Errore creazione ticket support:", ticketError?.message);
        }
        else {
            await svc.from("support_ticket_messages").insert({
                ticket_id: ticket.id,
                direction: "inbound",
                channel: "email",
                from_address: fromAddress,
                to_addresses: toAddresses,
                body: textBody || "",
                html_body: htmlBody,
                metadata: {
                    inboundEmailId: inboundRow?.id ?? null,
                    messageId,
                    attachments,
                },
            });
        }
    }
    return NextResponse.json({ ok: true, type: "inbound", brand });
}
// ─── Handler tracking events ──────────────────────────────────────────────────
function deliveryIssuePushText(event) {
    const to = Array.isArray(event.data.to) ? event.data.to.join(", ") : String(event.data.to ?? "");
    const subject = event.data.subject || "(nessun oggetto)";
    if (event.type === "email.delivery_delayed") {
        return {
            title: "Consegna email in ritardo",
            body: `${subject} · ${to}`,
        };
    }
    if (event.type === "email.bounced") {
        return {
            title: "Email rimbalzata",
            body: `${event.data.bounce?.message ?? subject} · ${to}`,
        };
    }
    if (event.type === "email.complained") {
        return {
            title: "Email segnata come spam",
            body: `${subject} · ${to}`,
        };
    }
    return null;
}
async function notifyDeliveryIssue(event, svc) {
    const push = deliveryIssuePushText(event);
    if (!push || !event.data.email_id)
        return;
    const { data: sent } = await svc
        .from("sent_emails")
        .select("id, tenant_id, sent_by_user_id")
        .eq("resend_message_id", event.data.email_id)
        .maybeSingle();
    const row = sent;
    const url = row?.tenant_id ? `/gestione/${row.tenant_id}/mail` : "/admin/inbox";
    const payload = {
        title: push.title,
        body: push.body,
        url,
        tag: `mail-delivery-issue-${event.data.email_id}-${event.type}`,
    };
    if (row?.sent_by_user_id) {
        const { data: siteadmin } = await svc
            .from("siteadmin")
            .select("id")
            .eq("user_id", row.sent_by_user_id)
            .eq("enabled", true)
            .maybeSingle();
        const siteadminId = siteadmin?.id;
        if (siteadminId) {
            await sendWebPushToSiteadmin(siteadminId, payload).catch((err) => {
                console.warn("[webhook:tracking] push delivery issue siteadmin fallita:", err);
            });
        }
    }
    if (row?.tenant_id) {
        const { data: subscriptions } = await svc
            .from("push_subscriptions")
            .select("id")
            .eq("tenant_id", row.tenant_id);
        const ids = (subscriptions ?? []).map((subscription) => subscription.id);
        if (ids.length) {
            await sendWebPushToSubscriptions(ids, payload).catch((err) => {
                console.warn("[webhook:tracking] push delivery issue tenant fallita:", err);
            });
        }
    }
}
async function handleTracking(event, svc) {
    const { email_id, from, to, subject, click, bounce, opened_at } = event.data;
    const toAddress = Array.isArray(to) ? to[0] : to;
    const brand = detectBrandFromSender(from ?? "");
    // Metadati specifici per tipo di evento
    const metadata = {};
    if (click)
        metadata.click = click;
    if (bounce)
        metadata.bounce = bounce;
    if (opened_at)
        metadata.opened_at = opened_at;
    // Salva evento tracking
    const { error: evErr } = await svc.from("email_tracking_events").insert({
        resend_email_id: email_id,
        event_type: event.type,
        from_address: from ?? null,
        to_address: toAddress ?? null,
        subject: subject ?? null,
        brand,
        metadata: metadata,
    });
    if (evErr) {
        console.error("[webhook:tracking] Errore tracking event:", evErr.message);
    }
    // Aggiorna status in sent_emails se applicabile
    const newStatus = trackingEventToStatus(event.type);
    if (newStatus && email_id) {
        await svc
            .from("sent_emails")
            .update({ status: newStatus })
            .eq("resend_message_id", email_id);
        if (event.type === "email.delivery_delayed" || event.type === "email.bounced" || event.type === "email.complained") {
            await notifyDeliveryIssue(event, svc);
        }
    }
    if (email_id) {
        const newsletterDb = svc;
        const { data: delivery } = await newsletterDb
            .from("tenant_newsletter_deliveries")
            .select("id, subscriber_id, status, open_count, click_count, first_opened_at, first_clicked_at")
            .eq("provider_message_id", email_id)
            .maybeSingle();
        if (delivery) {
            const now = event.created_at || new Date().toISOString();
            const update = {};
            if (event.type === "email.delivered") {
                update.status = delivery.status === "opened" || delivery.status === "clicked" ? delivery.status : "delivered";
                update.delivered_at = now;
            }
            else if (event.type === "email.opened") {
                update.status = delivery.status === "clicked" ? "clicked" : "opened";
                update.open_count = Number(delivery.open_count ?? 0) + 1;
                update.first_opened_at = delivery.first_opened_at ?? now;
                update.last_opened_at = now;
            }
            else if (event.type === "email.clicked") {
                update.status = "clicked";
                update.click_count = Number(delivery.click_count ?? 0) + 1;
                update.first_clicked_at = delivery.first_clicked_at ?? now;
                update.last_clicked_at = now;
                update.last_clicked_url = click?.link ?? null;
            }
            else if (event.type === "email.bounced" || event.type === "email.complained") {
                update.status = event.type === "email.bounced" ? "bounced" : "complained";
                update.failed_at = now;
                update.error_message = bounce?.message ?? event.type;
            }
            if (Object.keys(update).length > 0) {
                await newsletterDb
                    .from("tenant_newsletter_deliveries")
                    .update(update)
                    .eq("id", String(delivery.id));
            }
            if (delivery.subscriber_id &&
                (event.type === "email.bounced" || event.type === "email.complained")) {
                await newsletterDb
                    .from("tenant_newsletter_subscribers")
                    .update({
                    status: event.type === "email.bounced" ? "bounced" : "complained",
                    updated_at: now,
                })
                    .eq("id", String(delivery.subscriber_id));
            }
        }
    }
    return NextResponse.json({ ok: true, type: "tracking", event: event.type });
}
// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req) {
    const rawBody = await req.text();
    // Verifica firma svix (opzionale in dev, obbligatoria in prod)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
        const svixId = req.headers.get("svix-id") ?? "";
        const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
        const svixSignature = req.headers.get("svix-signature") ?? "";
        if (!svixId || !svixTimestamp || !svixSignature) {
            return NextResponse.json({ error: "Header svix mancanti." }, { status: 400 });
        }
        if (Math.abs(Date.now() / 1000 - parseInt(svixTimestamp, 10)) > 300) {
            return NextResponse.json({ error: "Timestamp scaduto." }, { status: 400 });
        }
        if (!verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, webhookSecret)) {
            return NextResponse.json({ error: "Firma non valida." }, { status: 401 });
        }
    }
    let parsed;
    try {
        parsed = JSON.parse(rawBody);
    }
    catch {
        return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
    }
    const obj = parsed;
    const eventType = obj.type;
    const svc = createSupabaseServiceClient();
    if (!svc) {
        console.warn("[webhook] Supabase service client non disponibile.");
        return NextResponse.json({ ok: true, stored: false });
    }
    // Email in arrivo
    if (!eventType || eventType === "email.received") {
        const inboundPayload = extractInboundPayload(obj);
        if (!inboundPayload) {
            return NextResponse.json({ error: "Payload non riconosciuto." }, { status: 400 });
        }
        return handleInbound(inboundPayload, svc);
    }
    // Evento di tracking outbound
    if (ALL_TRACKING_EVENTS.includes(eventType)) {
        return handleTracking(parsed, svc);
    }
    // Evento sconosciuto — accettiamo senza errore
    return NextResponse.json({ ok: true, ignored: true, eventType });
}
//# sourceMappingURL=inbound-webhook.js.map