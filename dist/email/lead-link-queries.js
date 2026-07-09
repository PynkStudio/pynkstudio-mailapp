"use server";
import { createSupabaseAdminClient } from "../server/runtime";
// ─── Auto-match ───────────────────────────────────────────────────────────────
/** Cerca lead con contact_email corrispondente a uno degli indirizzi forniti. */
export async function findLeadsByEmails(addresses) {
    if (addresses.length === 0)
        return [];
    const admin = createSupabaseAdminClient();
    const normalized = addresses.map((a) => a.toLowerCase().trim());
    const { data, error } = await admin
        .from("platform_leads")
        .select("id, business_name, contact_name, contact_email, business_vertical, status")
        .in("contact_email", normalized)
        .limit(5);
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
/** Recupera i lead per id (per risolvere FK in nome leggibile). */
export async function getLeadsByIds(ids) {
    if (ids.length === 0)
        return [];
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
        .from("platform_leads")
        .select("id, business_name, contact_name, contact_email, business_vertical, status")
        .in("id", ids);
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
/** Ricerca testuale lead per nome attività o email contatto (per il selettore manuale). */
export async function searchLeads(query) {
    if (!query.trim())
        return [];
    const admin = createSupabaseAdminClient();
    const q = `%${query.trim()}%`;
    const { data, error } = await admin
        .from("platform_leads")
        .select("id, business_name, contact_name, contact_email, business_vertical, status")
        .or(`business_name.ilike.${q},contact_email.ilike.${q},contact_name.ilike.${q}`)
        .limit(10);
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
// ─── Link / Unlink ────────────────────────────────────────────────────────────
export async function linkInboundEmailToLead(emailId, leadId) {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
        .from("inbound_emails")
        .update({ lead_id: leadId })
        .eq("id", emailId);
    if (error)
        throw new Error(error.message);
}
export async function linkSentEmailToLead(emailId, leadId) {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
        .from("sent_emails")
        .update({ lead_id: leadId })
        .eq("id", emailId);
    if (error)
        throw new Error(error.message);
}
//# sourceMappingURL=lead-link-queries.js.map