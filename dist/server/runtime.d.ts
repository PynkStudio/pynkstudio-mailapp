type RuntimeClient = {
    from: (table: string) => any;
    auth?: {
        getUser: () => Promise<any>;
    };
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
export declare function configureMailappRuntime(runtime: MailappRuntime): void;
export declare function getMailappRuntime(): MailappRuntime;
export declare function createSupabaseAdminClient(): RuntimeClient;
export declare function createSupabaseServiceClient(): RuntimeClient | null;
export declare function createSupabaseServerClient(cookieDomain?: string | null): Promise<RuntimeClient>;
export declare function sendWebPushToSiteadmin(siteadminId: string, payload: any): Promise<void>;
export declare function sendWebPushToSubscriptions(subscriptionIds: string[], payload: any): Promise<void>;
export declare function findTenantById(tenantId: string): MailappTenant | null;
export declare function resolveSessionCookieDomain(host: string | null): string | null;
export {};
//# sourceMappingURL=runtime.d.ts.map