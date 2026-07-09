import type { EmailBrand } from "../sender";
export type MarketingEmailParams = {
    brand: EmailBrand;
    preheader?: string;
    title: string;
    /** HTML accettato (usare <strong>, <br>, <a> ecc.) */
    body: string;
    cta?: {
        label: string;
        url: string;
    };
    /** Blocchi extra dopo il CTA, es. elenchi feature, immagini, ecc. */
    extraSections?: string;
    /** Mostra footer unsubscribe con link — passare l'URL del centro preferenze. */
    unsubscribeUrl?: string;
};
export declare function buildMarketingEmail(p: MarketingEmailParams): string;
//# sourceMappingURL=marketing.d.ts.map