import type { InboundEmailBrand } from "./inbound-types";
export type ResendTrackingEventType = "email.sent" | "email.delivered" | "email.delivery_delayed" | "email.bounced" | "email.complained" | "email.opened" | "email.clicked";
export type ResendTrackingPayload = {
    type: ResendTrackingEventType;
    created_at: string;
    data: {
        email_id: string;
        from: string;
        to: string[];
        subject: string;
        created_at: string;
        click?: {
            ipAddress: string;
            link: string;
            timestamp: string;
            userAgent: string;
        };
        bounce?: {
            message: string;
            type: "hard" | "soft";
        };
        opened_at?: string;
    };
};
export declare const TRACKING_EVENT_LABELS: Record<ResendTrackingEventType, string>;
export declare const TRACKING_EVENT_COLORS: Record<ResendTrackingEventType, string>;
/** Determina il brand dal from address dell'email di tracking. */
export declare function detectBrandFromSender(fromAddress: string): InboundEmailBrand;
/** Aggiorna lo status di sent_emails in base all'evento di tracking. */
export declare function trackingEventToStatus(eventType: ResendTrackingEventType): "sent" | "delivered" | "delivery_delayed" | "bounced" | "complained" | null;
export declare const ALL_TRACKING_EVENTS: ResendTrackingEventType[];
//# sourceMappingURL=tracking-types.d.ts.map