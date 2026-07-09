import type { InboundEmailBrand } from "./inbound-types";
export type AutoSignatureProfile = {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    email: string | null;
    role: string | null;
    signature_role?: string | null;
    phone: string | null;
    work_hours: string | null;
};
export type AutoSignature = {
    html: string;
    fromName: string;
};
export declare function buildAutoSignature(profile: AutoSignatureProfile, brand: InboundEmailBrand): AutoSignature;
//# sourceMappingURL=signature-queries.d.ts.map