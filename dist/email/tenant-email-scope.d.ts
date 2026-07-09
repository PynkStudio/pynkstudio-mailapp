import type { TenantProfile } from "../server/runtime";
export type TenantEmailScope = {
    tenantId: string;
};
export declare function buildTenantEmailScope(tenant: Pick<TenantProfile, "id">): TenantEmailScope;
//# sourceMappingURL=tenant-email-scope.d.ts.map