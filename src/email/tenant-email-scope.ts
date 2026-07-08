import type { TenantProfile } from "../server/runtime";

export type TenantEmailScope = {
  tenantId: string;
};

export function buildTenantEmailScope(tenant: Pick<TenantProfile, "id">): TenantEmailScope {
  return { tenantId: tenant.id };
}
