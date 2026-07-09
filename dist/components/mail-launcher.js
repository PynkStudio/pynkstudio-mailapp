"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ComposeDrawer } from "./compose-drawer";
const Ctx = createContext(null);
/** Hook globale per aprire la modale "Nuova mail" da qualsiasi punto del pannello admin. */
export function useMailLauncher() {
    return (useContext(Ctx) ?? {
        open: ({ to, subject }) => {
            // Fuori dal provider (es. rendering server o pagine non-admin):
            // ricadiamo sul mailto: nativo per non rompere il flusso.
            const params = subject ? `?subject=${encodeURIComponent(subject)}` : "";
            if (typeof window !== "undefined") {
                window.location.href = `mailto:${to}${params}`;
            }
        },
        canCompose: false,
    });
}
const COMPOSE_ROLES = new Set(["superadmin", "admin", "amministrazione", "venditore"]);
/**
 * Monta una singola istanza di {@link ComposeDrawer} a livello di shell admin
 * ed espone {@link useMailLauncher} per aprirla con un destinatario prefillato.
 */
export function MailLauncherProvider({ children }) {
    const [open, setOpen] = useState(false);
    const [prefill, setPrefill] = useState({ to: "" });
    const [canCompose, setCanCompose] = useState(false);
    useEffect(() => {
        let active = true;
        fetch("/api/admin/me", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
            if (active)
                setCanCompose(Boolean(d?.role && COMPOSE_ROLES.has(d.role)));
        })
            .catch(() => {
            if (active)
                setCanCompose(false);
        });
        return () => { active = false; };
    }, []);
    const openCompose = useCallback((opts) => {
        setPrefill(opts);
        setOpen(true);
    }, []);
    return (_jsxs(Ctx.Provider, { value: { open: openCompose, canCompose }, children: [children, _jsx(ComposeDrawer, { open: open, canCompose: canCompose, defaultBrand: prefill.brand ?? "menuary", initialTo: prefill.to, initialSubject: prefill.subject, initialBody: prefill.body, initialAttachments: prefill.attachments, onClose: () => setOpen(false), onSent: () => setOpen(false) })] }));
}
/**
 * Link/bottone che apre la modale di scrittura mail con destinatario prefillato.
 * Da usare al posto di `<a href="mailto:…">` in tutte le viste admin.
 */
export function MailLink({ to, subject, brand, className, children, }) {
    const launcher = useMailLauncher();
    return (_jsx("button", { type: "button", onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            launcher.open({ to, subject, brand });
        }, className: className, children: children }));
}
//# sourceMappingURL=mail-launcher.js.map