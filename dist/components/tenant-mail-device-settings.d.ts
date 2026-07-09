import { type MailDeviceFilter } from "../email/mail-device-filters";
type Props = {
    open: boolean;
    tenantId: string;
    onClose: () => void;
    /** Notifica il genitore quando il filtro locale cambia, per aggiornare la vista "Le mie". */
    onFilterChange: (filter: MailDeviceFilter | null) => void;
};
export declare function TenantMailDeviceSettings({ open, tenantId, onClose, onFilterChange }: Props): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=tenant-mail-device-settings.d.ts.map