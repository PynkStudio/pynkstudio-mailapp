"use server";

import { createSupabaseAdminClient } from "../server/runtime";
import { parseEmailAddress } from "./inbound-types";

/**
 * Filtri mail "per dispositivo" per i tenant: nessun account, un dispositivo
 * (identificato lato client con un id in localStorage, vedi src/lib/push/device-id.ts)
 * può assegnarsi una o più local-part (es. "fatturazione") per avere una
 * vista "Mie" e ricevere solo la push di quelle mail. Senza filtro configurato
 * il dispositivo riceve tutto (comportamento di default).
 */

export type MailDeviceFilter = {
  deviceId: string;
  label: string | null;
  localParts: string[];
};

function normalizeLocalParts(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\n;]/)
        .map((part) => part.trim().toLowerCase())
        .map((part) => part.split("@")[0]) // tollera che venga incollato l'indirizzo intero
        .filter(Boolean),
    ),
  );
}

export async function getMailDeviceFilter(tenantId: string, deviceId: string): Promise<MailDeviceFilter | null> {
  if (!deviceId) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tenant_mail_device_filters")
    .select("device_id, label, local_parts")
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { deviceId: data.device_id, label: data.label, localParts: data.local_parts };
}

export async function setMailDeviceFilter(
  tenantId: string,
  deviceId: string,
  localPartsRaw: string,
  label?: string | null,
): Promise<MailDeviceFilter> {
  const localParts = normalizeLocalParts(localPartsRaw);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tenant_mail_device_filters")
    .upsert(
      {
        tenant_id: tenantId,
        device_id: deviceId,
        label: label?.trim() || null,
        local_parts: localParts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,device_id" },
    )
    .select("device_id, label, local_parts")
    .single();
  if (error) throw new Error(error.message);
  return { deviceId: data.device_id, label: data.label, localParts: data.local_parts };
}

export async function clearMailDeviceFilter(tenantId: string, deviceId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("tenant_mail_device_filters")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId);
  if (error) throw new Error(error.message);
}

/**
 * Risolve gli id delle push_subscriptions del tenant da notificare per una
 * mail in arrivo: i dispositivi senza filtro configurato ricevono sempre
 * (default "tutte"); i dispositivi con filtro ricevono solo se una delle
 * local-part configurate compare tra i destinatari.
 */
export async function resolveTenantMailPushTargets(tenantId: string, toAddresses: string[]): Promise<string[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: subs, error: subsError }, { data: filters, error: filtersError }] = await Promise.all([
    admin.from("push_subscriptions").select("id, device_id").eq("tenant_id", tenantId),
    admin.from("tenant_mail_device_filters").select("device_id, local_parts").eq("tenant_id", tenantId),
  ]);
  if (subsError) throw new Error(subsError.message);
  if (filtersError) throw new Error(filtersError.message);
  if (!subs?.length) return [];

  const filterMap = new Map(
    ((filters ?? []) as Array<{ device_id: string; local_parts: string[] }>).map((f) => [f.device_id, f.local_parts]),
  );
  const recipientLocalParts = new Set(
    toAddresses
      .map((address) => parseEmailAddress(address).address.split("@")[0]?.toLowerCase())
      .filter(Boolean),
  );

  return ((subs ?? []) as Array<{ id: string; device_id: string | null }>)
    .filter((sub) => {
      const localParts = sub.device_id ? filterMap.get(sub.device_id) : undefined;
      if (!localParts?.length) return true; // nessun filtro → riceve tutto
      return localParts.some((part: string) => recipientLocalParts.has(part));
    })
    .map((sub) => sub.id);
}
