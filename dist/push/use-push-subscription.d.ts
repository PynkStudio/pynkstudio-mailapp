/**
 * Hook riusabile per attivare/disattivare Web Push su un dispositivo, per
 * qualsiasi portale (admin piattaforma, gestione tenant, agenda, ecc.).
 * Incapsula: registrazione service worker, permesso Notification, subscribe
 * PushManager e chiamata alle API generiche /api/push/subscribe|unsubscribe.
 *
 * Il `target` determina a chi sono legate le subscription lato server
 * (vedi src/app/api/push/subscribe/route.ts e src/lib/push/send.ts).
 */
export type PushSubscribeTarget = {
    scope: "tenant";
    tenantId: string;
} | {
    scope: "siteadmin";
};
export type PushSubscriptionStatus = "unsupported" | "default" | "denied" | "granted" | "working";
type Options = {
    /** Path del service worker da registrare per questo portale, es. "/admin-sw.js". */
    swPath: string;
    target: PushSubscribeTarget;
};
export declare function usePushSubscription({ swPath, target }: Options): {
    status: PushSubscriptionStatus;
    error: string | null;
    enable: () => Promise<boolean>;
    disable: () => Promise<void>;
};
export {};
//# sourceMappingURL=use-push-subscription.d.ts.map