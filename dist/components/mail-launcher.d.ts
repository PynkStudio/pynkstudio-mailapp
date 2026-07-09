import { type ComposeAttachment } from "./compose-drawer";
import type { InboundEmailBrand } from "../email/inbound-types";
type OpenOptions = {
    to: string;
    subject?: string;
    brand?: InboundEmailBrand;
    body?: string;
    attachments?: ComposeAttachment[];
};
type LauncherCtx = {
    open: (opts: OpenOptions) => void;
    canCompose: boolean;
};
/** Hook globale per aprire la modale "Nuova mail" da qualsiasi punto del pannello admin. */
export declare function useMailLauncher(): LauncherCtx;
/**
 * Monta una singola istanza di {@link ComposeDrawer} a livello di shell admin
 * ed espone {@link useMailLauncher} per aprirla con un destinatario prefillato.
 */
export declare function MailLauncherProvider({ children }: {
    children: React.ReactNode;
}): import("react").JSX.Element;
/**
 * Link/bottone che apre la modale di scrittura mail con destinatario prefillato.
 * Da usare al posto di `<a href="mailto:…">` in tutte le viste admin.
 */
export declare function MailLink({ to, subject, brand, className, children, }: {
    to: string;
    subject?: string;
    brand?: InboundEmailBrand;
    className?: string;
    children: React.ReactNode;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=mail-launcher.d.ts.map