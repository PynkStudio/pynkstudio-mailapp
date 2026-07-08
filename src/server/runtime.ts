type RuntimeClient = {
  from: (table: string) => any;
  auth?: { getUser: () => Promise<any> };
};

export type MailappTenant = {
  id: string;
  name?: string;
  domains?: string[];
  vertical?: TenantVertical;
};

export type TenantVertical = "food" | "services" | "creative" | string;

export type TenantProfile = MailappTenant;

export type MailappRuntime = {
  createSupabaseAdminClient: () => RuntimeClient;
  createSupabaseServiceClient?: () => RuntimeClient | null;
  createSupabaseServerClient?: (cookieDomain?: string | null) => Promise<RuntimeClient> | RuntimeClient;
  sendWebPushToSiteadmin?: (siteadminId: string, payload: any) => Promise<void>;
  sendWebPushToSubscriptions?: (subscriptionIds: string[], payload: any) => Promise<void>;
  findTenantById?: (tenantId: string) => MailappTenant | null;
  resolveSessionCookieDomain?: (host: string | null) => string | null;
  loginUrl?: string;
};

const RUNTIME_KEY = Symbol.for("pynkstudio.mailapp.runtime");

type RuntimeGlobal = typeof globalThis & {
  [RUNTIME_KEY]?: MailappRuntime;
};

export function configureMailappRuntime(runtime: MailappRuntime): void {
  (globalThis as RuntimeGlobal)[RUNTIME_KEY] = runtime;
}

export function getMailappRuntime(): MailappRuntime {
  const runtime = (globalThis as RuntimeGlobal)[RUNTIME_KEY];
  if (!runtime) {
    throw new Error(
      "@pynkstudio/mailapp runtime is not configured. Call configureMailappRuntime() from the host app before using server actions.",
    );
  }
  return runtime;
}

export function createSupabaseAdminClient(): RuntimeClient {
  return getMailappRuntime().createSupabaseAdminClient();
}

export function createSupabaseServiceClient(): RuntimeClient | null {
  return getMailappRuntime().createSupabaseServiceClient?.() ?? null;
}

export async function createSupabaseServerClient(cookieDomain?: string | null): Promise<RuntimeClient> {
  const factory = getMailappRuntime().createSupabaseServerClient;
  if (!factory) {
    throw new Error("createSupabaseServerClient is not configured in @pynkstudio/mailapp runtime.");
  }
  return factory(cookieDomain);
}

export async function sendWebPushToSiteadmin(siteadminId: string, payload: any): Promise<void> {
  await getMailappRuntime().sendWebPushToSiteadmin?.(siteadminId, payload);
}

export async function sendWebPushToSubscriptions(subscriptionIds: string[], payload: any): Promise<void> {
  await getMailappRuntime().sendWebPushToSubscriptions?.(subscriptionIds, payload);
}

export function findTenantById(tenantId: string): MailappTenant | null {
  return getMailappRuntime().findTenantById?.(tenantId) ?? null;
}

export function resolveSessionCookieDomain(host: string | null): string | null {
  return getMailappRuntime().resolveSessionCookieDomain?.(host) ?? null;
}
