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
export declare function getMailDeviceFilter(tenantId: string, deviceId: string): Promise<MailDeviceFilter | null>;
export declare function setMailDeviceFilter(tenantId: string, deviceId: string, localPartsRaw: string, label?: string | null): Promise<MailDeviceFilter>;
export declare function clearMailDeviceFilter(tenantId: string, deviceId: string): Promise<void>;
/**
 * Risolve gli id delle push_subscriptions del tenant da notificare per una
 * mail in arrivo: i dispositivi senza filtro configurato ricevono sempre
 * (default "tutte"); i dispositivi con filtro ricevono solo se una delle
 * local-part configurate compare tra i destinatari.
 */
export declare function resolveTenantMailPushTargets(tenantId: string, toAddresses: string[]): Promise<string[]>;
//# sourceMappingURL=mail-device-filters.d.ts.map