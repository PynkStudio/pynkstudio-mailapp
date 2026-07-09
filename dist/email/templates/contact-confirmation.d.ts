import type { EmailBrand } from "../sender";
type ContactConfirmationParams = {
    brand: EmailBrand;
    firstName: string;
    /** Nome azienda/ristorante del lead */
    businessName: string;
};
export declare function buildContactConfirmationEmail(p: ContactConfirmationParams): string;
export {};
//# sourceMappingURL=contact-confirmation.d.ts.map