import type { InboxPage } from "../email/inbound-queries";
import type { SentPage } from "../email/sent-queries";
import type { TenantEmailScope } from "../email/tenant-email-scope";
type Props = {
    initialInbox: InboxPage;
    initialSent: SentPage;
    unreadTotal: number;
    unreadMine: number;
    currentSiteadminId: string | null;
    canCompose: boolean;
    mode?: "platform" | "tenant";
    scope?: TenantEmailScope;
    tenantId?: string;
    tenantName?: string;
    tenantFromAddress?: string;
    currentUserEmail?: string | null;
};
export declare function MailApp({ initialInbox, initialSent, unreadTotal, unreadMine, currentSiteadminId, canCompose, mode, scope, tenantId, tenantName, tenantFromAddress, currentUserEmail, }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=mail-app.d.ts.map