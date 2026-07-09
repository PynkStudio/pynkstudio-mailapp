"use server";
import { createSupabaseAdminClient } from "../server/runtime";
import { sendWebPushToSiteadmin } from "../server/runtime";
import { parseEmailAddress } from "./inbound-types";
const PAGE_SIZE = 30;
// ─── List ─────────────────────────────────────────────────────────────────────
export async function getInboundEmails(filter = {}) {
    const admin = createSupabaseAdminClient();
    const page = filter.page ?? 1;
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = admin
        .from("inbound_emails")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
    if (filter.scope) {
        query = query.eq("tenant_id", filter.scope.tenantId);
    }
    if (!filter.scope && filter.brand === "support") {
        query = query.or("to_addresses.cs.{support@menuary.it},to_addresses.cs.{support@bizery.it},to_addresses.cs.{support@weuseorpheo.com}");
    }
    else if (!filter.scope && filter.brand && filter.brand !== "all") {
        query = query.eq("brand", filter.brand);
    }
    if (filter.onlyUnread)
        query = query.eq("read", false);
    if (filter.onlyStarred)
        query = query.eq("starred", true);
    if (filter.assignedToUserId)
        query = query.eq("assigned_to_user_id", filter.assignedToUserId);
    // Di default esclude spam e archiviate, salvo vista dedicata
    if (filter.spam) {
        query = query.eq("spam", true);
    }
    else {
        query = query.eq("spam", false).eq("archived", filter.archived ?? false);
    }
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    let emails = (data ?? []);
    let total = count ?? 0;
    // Filtro "per dispositivo" (nessuna colonna dedicata: si applica sul batch
    // già filtrato/paginato lato server, coerente col fatto che questa mail app
    // non ha ancora una UI di paginazione reale).
    if (filter.matchLocalParts?.length) {
        const wanted = new Set(filter.matchLocalParts.map((p) => p.toLowerCase()));
        emails = emails.filter((email) => email.to_addresses.some((address) => wanted.has(address.split("@")[0]?.toLowerCase() ?? "")));
        total = emails.length;
    }
    return {
        emails,
        total,
        page,
        pageSize: PAGE_SIZE,
    };
}
export async function getInboxUnreadCounts() {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
        .from("inbound_emails")
        .select("brand", { count: "exact" })
        .eq("read", false)
        .eq("archived", false)
        .eq("spam", false);
    if (error)
        throw new Error(error.message);
    const rows = (data ?? []);
    const unread_menuary = rows.filter((r) => r.brand === "menuary").length;
    const unread_bizery = rows.filter((r) => r.brand === "bizery").length;
    const unread_orpheo = rows.filter((r) => r.brand === "orpheo").length;
    const unread_pynkstudio = rows.filter((r) => r.brand === "pynkstudio").length;
    return { unread_menuary, unread_bizery, unread_orpheo, unread_pynkstudio, unread_total: unread_menuary + unread_bizery + unread_orpheo + unread_pynkstudio };
}
export async function getTenantInboxUnreadCount(scope, matchLocalParts) {
    const admin = createSupabaseAdminClient();
    if (!matchLocalParts?.length) {
        const { count, error } = await admin
            .from("inbound_emails")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", scope.tenantId)
            .eq("read", false)
            .eq("archived", false)
            .eq("spam", false);
        if (error)
            throw new Error(error.message);
        return count ?? 0;
    }
    const wanted = new Set(matchLocalParts.map((p) => p.toLowerCase()));
    const { data, error } = await admin
        .from("inbound_emails")
        .select("to_addresses")
        .eq("tenant_id", scope.tenantId)
        .eq("read", false)
        .eq("archived", false)
        .eq("spam", false);
    if (error)
        throw new Error(error.message);
    return (data ?? []).filter((row) => row.to_addresses.some((address) => wanted.has(address.split("@")[0]?.toLowerCase() ?? ""))).length;
}
// ─── Single email ─────────────────────────────────────────────────────────────
export async function getInboundEmailById(id, scope) {
    const admin = createSupabaseAdminClient();
    let query = admin
        .from("inbound_emails")
        .select("*")
        .eq("id", id);
    if (scope)
        query = query.eq("tenant_id", scope.tenantId);
    const { data, error } = await query
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    return data;
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
async function fetchResendJson(path) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey)
        return null;
    const res = await fetch(`https://api.resend.com${path}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok)
        return null;
    return (await res.json());
}
async function fetchAttachmentContent(downloadUrl) {
    const res = await fetch(downloadUrl);
    if (!res.ok)
        return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.toString("base64");
}
async function findReceivedEmailId(email) {
    const list = await fetchResendJson("/emails/receiving");
    if (!list?.data?.length)
        return null;
    const matchByMessageId = email.message_id
        ? list.data.find((item) => item.message_id === email.message_id)
        : null;
    if (matchByMessageId?.id)
        return matchByMessageId.id;
    const createdAt = new Date(email.created_at).getTime();
    const match = list.data.find((item) => {
        const fromAddress = item.from ? parseEmailAddress(item.from).address.toLowerCase() : "";
        const itemCreatedAt = "created_at" in item && typeof item.created_at === "string"
            ? new Date(item.created_at).getTime()
            : createdAt;
        const isCloseInTime = Math.abs(itemCreatedAt - createdAt) < 7 * 24 * 60 * 60 * 1000;
        return (fromAddress === email.from_address.toLowerCase() &&
            item.subject === email.subject &&
            isCloseInTime);
    });
    return match?.id ?? null;
}
async function fetchReceivedAttachments(emailId) {
    const list = await fetchResendJson(`/emails/receiving/${encodeURIComponent(emailId)}/attachments`);
    return Promise.all((list?.data ?? []).map(async (attachment) => {
        if (!attachment.download_url)
            return attachment;
        const content = await fetchAttachmentContent(attachment.download_url).catch(() => null);
        return content ? { ...attachment, content } : attachment;
    }));
}
export async function hydrateInboundEmailContent(id, scope) {
    const email = await getInboundEmailById(id, scope);
    if (!email)
        return null;
    const needsBody = !email.html_body && !email.text_body;
    const needsAttachments = email.attachments.some((attachment) => !attachment.content);
    if (!needsBody && !needsAttachments)
        return email;
    const resendEmailId = await findReceivedEmailId(email);
    if (!resendEmailId)
        return email;
    const received = await fetchResendJson(`/emails/receiving/${encodeURIComponent(resendEmailId)}`);
    if (!received)
        return email;
    const attachments = needsAttachments
        ? await fetchReceivedAttachments(resendEmailId)
        : email.attachments;
    const update = {
        html_body: received.html ?? email.html_body,
        text_body: received.text ?? email.text_body,
        headers: normalizeHeaders(received.headers ?? email.headers),
        attachments: attachments,
    };
    const admin = createSupabaseAdminClient();
    let query = admin
        .from("inbound_emails")
        .update(update)
        .eq("id", id);
    if (scope)
        query = query.eq("tenant_id", scope.tenantId);
    const { data, error } = await query.select("*")
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    return data;
}
// ─── Mutations ────────────────────────────────────────────────────────────────
export async function markEmailRead(id, read, scope) {
    const admin = createSupabaseAdminClient();
    let query = admin
        .from("inbound_emails")
        .update({ read })
        .eq("id", id);
    if (scope)
        query = query.eq("tenant_id", scope.tenantId);
    const { error } = await query;
    if (error)
        throw new Error(error.message);
}
export async function starEmail(id, starred, scope) {
    const admin = createSupabaseAdminClient();
    let query = admin
        .from("inbound_emails")
        .update({ starred })
        .eq("id", id);
    if (scope)
        query = query.eq("tenant_id", scope.tenantId);
    const { error } = await query;
    if (error)
        throw new Error(error.message);
}
export async function archiveEmail(id, scope) {
    const admin = createSupabaseAdminClient();
    let query = admin
        .from("inbound_emails")
        .update({ archived: true, read: true })
        .eq("id", id);
    if (scope)
        query = query.eq("tenant_id", scope.tenantId);
    const { error } = await query;
    if (error)
        throw new Error(error.message);
}
/**
 * Segna/rimuove lo stato spam. Marcando spam il mittente entra nella blocklist
 * (globale se senza scope, per-tenant se con scope): le prossime email di quel
 * mittente arrivano già flaggate spam dal webhook inbound.
 */
export async function markEmailSpam(id, spam, scope) {
    const email = await getInboundEmailById(id, scope);
    if (!email)
        throw new Error("Email non trovata.");
    const admin = createSupabaseAdminClient();
    let query = admin
        .from("inbound_emails")
        .update(spam ? { spam: true, read: true } : { spam: false })
        .eq("id", id);
    if (scope)
        query = query.eq("tenant_id", scope.tenantId);
    const { error } = await query;
    if (error)
        throw new Error(error.message);
    const address = email.from_address.trim().toLowerCase();
    const tenantId = scope?.tenantId ?? null;
    if (spam) {
        const { error: blockError } = await admin
            .from("email_spam_senders")
            .upsert({ address, tenant_id: tenantId }, { onConflict: "address,tenant_id" });
        if (blockError)
            throw new Error(blockError.message);
    }
    else {
        let unblock = admin.from("email_spam_senders").delete().eq("address", address);
        unblock = tenantId ? unblock.eq("tenant_id", tenantId) : unblock.is("tenant_id", null);
        const { error: unblockError } = await unblock;
        if (unblockError)
            throw new Error(unblockError.message);
    }
}
export async function deleteEmail(id, scope) {
    const admin = createSupabaseAdminClient();
    let query = admin
        .from("inbound_emails")
        .delete()
        .eq("id", id);
    if (scope)
        query = query.eq("tenant_id", scope.tenantId);
    const { error } = await query;
    if (error)
        throw new Error(error.message);
}
/** Assegna (o rimuove l'assegnazione di) un'email a un utente siteadmin. */
export async function assignEmail(id, siteadminId) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
        .from("inbound_emails")
        .update({ assigned_to_user_id: siteadminId })
        .eq("id", id)
        .select("from_address, from_name, subject")
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (siteadminId && data) {
        await sendWebPushToSiteadmin(siteadminId, {
            title: "Mail assegnata a te",
            body: `${data.from_name ?? data.from_address}: ${data.subject}`,
            url: "/admin/inbox",
            tag: `admin-inbox-${id}`,
        }).catch((err) => console.warn("[assignEmail] push fallita:", err));
    }
}
/** Conta le email non lette assegnate a un utente specifico. */
export async function getInboxUnreadCountForUser(siteadminId) {
    const admin = createSupabaseAdminClient();
    const { count, error } = await admin
        .from("inbound_emails")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to_user_id", siteadminId)
        .eq("read", false)
        .eq("archived", false)
        .eq("spam", false);
    if (error)
        throw new Error(error.message);
    return count ?? 0;
}
//# sourceMappingURL=inbound-queries.js.map