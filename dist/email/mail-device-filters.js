"use server";
import { createSupabaseAdminClient } from "../server/runtime";
import { parseEmailAddress } from "./inbound-types";
function normalizeLocalParts(raw) {
    return Array.from(new Set(raw
        .split(/[,\n;]/)
        .map((part) => part.trim().toLowerCase())
        .map((part) => part.split("@")[0]) // tollera che venga incollato l'indirizzo intero
        .filter(Boolean)));
}
export async function getMailDeviceFilter(tenantId, deviceId) {
    if (!deviceId)
        return null;
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
        .from("tenant_mail_device_filters")
        .select("device_id, label, local_parts")
        .eq("tenant_id", tenantId)
        .eq("device_id", deviceId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        return null;
    return { deviceId: data.device_id, label: data.label, localParts: data.local_parts };
}
export async function setMailDeviceFilter(tenantId, deviceId, localPartsRaw, label) {
    const localParts = normalizeLocalParts(localPartsRaw);
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
        .from("tenant_mail_device_filters")
        .upsert({
        tenant_id: tenantId,
        device_id: deviceId,
        label: label?.trim() || null,
        local_parts: localParts,
        updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,device_id" })
        .select("device_id, label, local_parts")
        .single();
    if (error)
        throw new Error(error.message);
    return { deviceId: data.device_id, label: data.label, localParts: data.local_parts };
}
export async function clearMailDeviceFilter(tenantId, deviceId) {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
        .from("tenant_mail_device_filters")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("device_id", deviceId);
    if (error)
        throw new Error(error.message);
}
/**
 * Risolve gli id delle push_subscriptions del tenant da notificare per una
 * mail in arrivo: i dispositivi senza filtro configurato ricevono sempre
 * (default "tutte"); i dispositivi con filtro ricevono solo se una delle
 * local-part configurate compare tra i destinatari.
 */
export async function resolveTenantMailPushTargets(tenantId, toAddresses) {
    const admin = createSupabaseAdminClient();
    const [{ data: subs, error: subsError }, { data: filters, error: filtersError }] = await Promise.all([
        admin.from("push_subscriptions").select("id, device_id").eq("tenant_id", tenantId),
        admin.from("tenant_mail_device_filters").select("device_id, local_parts").eq("tenant_id", tenantId),
    ]);
    if (subsError)
        throw new Error(subsError.message);
    if (filtersError)
        throw new Error(filtersError.message);
    if (!subs?.length)
        return [];
    const filterMap = new Map((filters ?? []).map((f) => [f.device_id, f.local_parts]));
    const recipientLocalParts = new Set(toAddresses
        .map((address) => parseEmailAddress(address).address.split("@")[0]?.toLowerCase())
        .filter(Boolean));
    return (subs ?? [])
        .filter((sub) => {
        const localParts = sub.device_id ? filterMap.get(sub.device_id) : undefined;
        if (!localParts?.length)
            return true; // nessun filtro → riceve tutto
        return localParts.some((part) => recipientLocalParts.has(part));
    })
        .map((sub) => sub.id);
}
//# sourceMappingURL=mail-device-filters.js.map