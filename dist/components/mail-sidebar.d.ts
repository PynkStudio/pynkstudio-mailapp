import type { InboundEmailBrand } from "../email/inbound-types";
export type MailView = "inbox" | "unread" | "mine" | "sent" | "issues" | "starred" | "spam" | "archived";
export type BrandFilter = InboundEmailBrand | "all" | "support";
type Props = {
    view: MailView;
    brand: BrandFilter;
    unreadCount: number;
    unreadMine: number;
    deliveryIssueCount?: number;
    canCompose: boolean;
    mode?: "platform" | "tenant";
    /** Se false nasconde la vista "Le mie" (tenant senza filtro dispositivo configurato). Default true. */
    mineAvailable?: boolean;
    onViewChange: (v: MailView) => void;
    onBrandChange: (b: BrandFilter) => void;
    onCompose: () => void;
    /** Tenant: apre il pannello di configurazione filtro/notifiche per questo dispositivo. */
    onOpenDeviceSettings?: () => void;
};
export declare function MailSidebar({ view, brand, unreadCount, unreadMine, deliveryIssueCount, canCompose, mode, mineAvailable, onViewChange, onBrandChange, onCompose, onOpenDeviceSettings }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=mail-sidebar.d.ts.map