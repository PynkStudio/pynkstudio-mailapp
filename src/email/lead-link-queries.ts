"use server";

import { createSupabaseAdminClient } from "../server/runtime";

export type LeadMatch = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  business_vertical: string | null;
  status: string | null;
};

// ─── Auto-match ───────────────────────────────────────────────────────────────

/** Cerca lead con contact_email corrispondente a uno degli indirizzi forniti. */
export async function findLeadsByEmails(addresses: string[]): Promise<LeadMatch[]> {
  if (addresses.length === 0) return [];
  const admin = createSupabaseAdminClient();
  const normalized = addresses.map((a) => a.toLowerCase().trim());

  const { data, error } = await admin
    .from("platform_leads")
    .select("id, business_name, contact_name, contact_email, business_vertical, status")
    .in("contact_email", normalized)
    .limit(5);

  if (error) throw new Error(error.message);
  return (data ?? []) as LeadMatch[];
}

/** Recupera i lead per id (per risolvere FK in nome leggibile). */
export async function getLeadsByIds(ids: string[]): Promise<LeadMatch[]> {
  if (ids.length === 0) return [];
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("platform_leads")
    .select("id, business_name, contact_name, contact_email, business_vertical, status")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadMatch[];
}

/** Ricerca testuale lead per nome attività o email contatto (per il selettore manuale). */
export async function searchLeads(query: string): Promise<LeadMatch[]> {
  if (!query.trim()) return [];
  const admin = createSupabaseAdminClient();
  const q = `%${query.trim()}%`;

  const { data, error } = await admin
    .from("platform_leads")
    .select("id, business_name, contact_name, contact_email, business_vertical, status")
    .or(`business_name.ilike.${q},contact_email.ilike.${q},contact_name.ilike.${q}`)
    .limit(10);

  if (error) throw new Error(error.message);
  return (data ?? []) as LeadMatch[];
}

// ─── Link / Unlink ────────────────────────────────────────────────────────────

export async function linkInboundEmailToLead(emailId: string, leadId: string | null): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("inbound_emails")
    .update({ lead_id: leadId })
    .eq("id", emailId);
  if (error) throw new Error(error.message);
}

export async function linkSentEmailToLead(emailId: string, leadId: string | null): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("sent_emails")
    .update({ lead_id: leadId })
    .eq("id", emailId);
  if (error) throw new Error(error.message);
}
