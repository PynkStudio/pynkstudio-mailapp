import type { EmailBrand } from "../sender";
export type OrderConfirmationLine = {
    qty: number;
    name: string;
    variantLabel?: string;
    lineTotal: number;
    note?: string;
};
export type OrderConfirmationParams = {
    brand: EmailBrand;
    tenantName: string;
    orderCode: string;
    customerName?: string;
    type: "tavolo" | "asporto";
    dineOption?: "dine_in" | "takeaway" | "delivery";
    tableLabel?: string;
    pickupTime?: string;
    notes?: string;
    lines: OrderConfirmationLine[];
    total: number;
};
export declare function buildOrderConfirmationEmail(p: OrderConfirmationParams): string;
//# sourceMappingURL=order-confirmation.d.ts.map