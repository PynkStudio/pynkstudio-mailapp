import type { InboundEmail } from "../email/inbound-types";
import type { TenantEmailScope } from "../email/tenant-email-scope";
type Props = {
    email: InboundEmail;
    threadEmails?: InboundEmail[];
    onClose: () => void;
    onMutated: () => void;
    onReply?: (email: InboundEmail) => void;
    onAssigned?: (emailId: string, siteadminId: string | null) => void;
    mode?: "platform" | "tenant";
    scope?: TenantEmailScope;
};
export declare function EmailDetail({ email, threadEmails, onClose, onMutated, onReply, onAssigned, mode, scope }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=email-detail.d.ts.map