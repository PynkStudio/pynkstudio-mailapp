import type { InboundEmailBrand } from "./inbound-types";
import type { TenantEmailScope } from "./tenant-email-scope";
export type SentEmail = {
    id: string;
    created_at: string;
    resend_message_id: string | null;
    from_address: string;
    from_name: string | null;
    to_addresses: string[];
    subject: string;
    html_body: string | null;
    brand: InboundEmailBrand;
    tenant_id?: string | null;
    sent_by_user_id: string | null;
    sent_by_name: string | null;
    status: "sent" | "delivered" | "delivery_delayed" | "bounced" | "complained";
    lead_id: string | null;
};
export type SentPage = {
    emails: SentEmail[];
    total: number;
    page: number;
    pageSize: number;
};
export declare function getSentEmails(brand?: InboundEmailBrand | "all" | "support", page?: number, scope?: TenantEmailScope): Promise<SentPage>;
export declare function getSentEmailById(id: string): Promise<SentEmail | null>;
//# sourceMappingURL=sent-queries.d.ts.map