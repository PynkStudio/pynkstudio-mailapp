import type { InboundEmailBrand } from "../email/inbound-types";
export type ComposeAttachment = {
    filename: string;
    /** Base64 senza prefisso `data:` */
    content: string;
    contentType?: string;
    /** Dimensione in byte, calcolata dal base64. */
    size: number;
};
type Props = {
    open: boolean;
    canCompose: boolean;
    onClose: () => void;
    onSent: () => void;
    defaultBrand?: InboundEmailBrand;
    tenantId?: string;
    fromAddress?: string;
    fromName?: string;
    currentUserEmail?: string | null;
    lockBrand?: boolean;
    preferredFromAddress?: string;
    initialTo?: string;
    initialSubject?: string;
    initialBody?: string;
    initialAttachments?: ComposeAttachment[];
};
export declare function ComposeDrawer({ open, canCompose, onClose, onSent, defaultBrand, tenantId, fromAddress, fromName, currentUserEmail, lockBrand, preferredFromAddress, initialTo, initialSubject, initialBody, initialAttachments, }: Props): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=compose-drawer.d.ts.map