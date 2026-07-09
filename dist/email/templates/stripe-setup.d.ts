import type { EmailBrand } from "../sender";
import type { TenantSetupModule } from "../../core/stripe-setup-types";
export declare function buildStripeSetupEmail(params: {
    brand: EmailBrand;
    tenantName: string;
    setupUrl: string;
    modules?: TenantSetupModule[];
}): string;
//# sourceMappingURL=stripe-setup.d.ts.map