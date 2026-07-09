const RUNTIME_KEY = Symbol.for("pynkstudio.mailapp.runtime");
export function configureMailappRuntime(runtime) {
    globalThis[RUNTIME_KEY] = runtime;
}
export function getMailappRuntime() {
    const runtime = globalThis[RUNTIME_KEY];
    if (!runtime) {
        throw new Error("@pynkstudio/mailapp runtime is not configured. Call configureMailappRuntime() from the host app before using server actions.");
    }
    return runtime;
}
export function createSupabaseAdminClient() {
    return getMailappRuntime().createSupabaseAdminClient();
}
export function createSupabaseServiceClient() {
    return getMailappRuntime().createSupabaseServiceClient?.() ?? null;
}
export async function createSupabaseServerClient(cookieDomain) {
    const factory = getMailappRuntime().createSupabaseServerClient;
    if (!factory) {
        throw new Error("createSupabaseServerClient is not configured in @pynkstudio/mailapp runtime.");
    }
    return factory(cookieDomain);
}
export async function sendWebPushToSiteadmin(siteadminId, payload) {
    await getMailappRuntime().sendWebPushToSiteadmin?.(siteadminId, payload);
}
export async function sendWebPushToSubscriptions(subscriptionIds, payload) {
    await getMailappRuntime().sendWebPushToSubscriptions?.(subscriptionIds, payload);
}
export function findTenantById(tenantId) {
    return getMailappRuntime().findTenantById?.(tenantId) ?? null;
}
export function resolveSessionCookieDomain(host) {
    return getMailappRuntime().resolveSessionCookieDomain?.(host) ?? null;
}
//# sourceMappingURL=runtime.js.map