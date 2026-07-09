"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, ShieldCheck, X } from "lucide-react";
import { cn } from "../utils";
import { getDeviceId } from "../push/device-id";
import { usePushSubscription } from "../push/use-push-subscription";
import { getMailDeviceFilter, setMailDeviceFilter, clearMailDeviceFilter } from "../email/mail-device-filters";
const GESTIONE_SW_PATH = "/gestione-sw.js";
export function TenantMailDeviceSettings({ open, tenantId, onClose, onFilterChange }) {
    const push = usePushSubscription({ swPath: GESTIONE_SW_PATH, target: { scope: "tenant", tenantId } });
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);
    const [label, setLabel] = useState("");
    const [localPartsRaw, setLocalPartsRaw] = useState("");
    const [savedFilter, setSavedFilter] = useState(null);
    useEffect(() => {
        if (!open)
            return;
        let cancelled = false;
        setLoading(true);
        const deviceId = getDeviceId();
        getMailDeviceFilter(tenantId, deviceId)
            .then((filter) => {
            if (cancelled)
                return;
            setSavedFilter(filter);
            setLabel(filter?.label ?? "");
            setLocalPartsRaw(filter?.localParts.join(", ") ?? "");
        })
            .catch(() => { })
            .finally(() => { if (!cancelled)
            setLoading(false); });
        return () => { cancelled = true; };
    }, [open, tenantId]);
    function handleSave() {
        startTransition(async () => {
            const deviceId = getDeviceId();
            const filter = await setMailDeviceFilter(tenantId, deviceId, localPartsRaw, label);
            setSavedFilter(filter);
            onFilterChange(filter.localParts.length > 0 ? filter : null);
        });
    }
    function handleClear() {
        startTransition(async () => {
            const deviceId = getDeviceId();
            await clearMailDeviceFilter(tenantId, deviceId);
            setSavedFilter(null);
            setLabel("");
            setLocalPartsRaw("");
            onFilterChange(null);
        });
    }
    const enabled = push.status === "granted";
    const blocked = push.status === "denied";
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center", children: [_jsx("div", { className: "absolute inset-0 bg-black/30 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { className: "relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-[var(--ma-line)] px-5 py-4", children: [_jsx("h2", { className: "font-semibold text-[var(--ma-ink)]", children: "Questo dispositivo" }), _jsx("button", { onClick: onClose, className: "menuary-admin-nav-link !w-auto !px-2 !py-1.5", "aria-label": "Chiudi", children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-5 py-4", children: [_jsxs("div", { className: "mb-5", children: [_jsx("p", { className: "mb-2 text-sm font-semibold text-[var(--ma-ink)]", children: "Notifiche push" }), _jsx("p", { className: "mb-3 text-xs text-[var(--ma-muted)]", children: "Attivale per ricevere un avviso su questo dispositivo quando arriva una nuova mail." }), push.status === "unsupported" ? (_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-[var(--ma-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ma-muted)]", children: [_jsx(BellOff, { size: 13 }), " Non supportate su questo browser"] })) : enabled ? (_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700", children: [_jsx(ShieldCheck, { size: 13 }), " Attive su questo dispositivo"] })) : blocked ? (_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-[var(--ma-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ma-muted)]", children: [_jsx(BellOff, { size: 13 }), " Bloccate dal browser"] })) : (_jsxs("button", { type: "button", onClick: () => void push.enable(), disabled: push.status === "working", className: "menuary-admin-action-btn inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs", children: [_jsx(Bell, { size: 13 }), push.status === "working" ? "Attivazione…" : "Attiva notifiche"] })), push.error && _jsx("p", { className: "mt-1.5 text-xs text-red-500", children: push.error })] }), _jsxs("div", { className: "border-t border-[var(--ma-line)] pt-4", children: [_jsx("p", { className: "mb-1 text-sm font-semibold text-[var(--ma-ink)]", children: "Filtro avanzato (opzionale)" }), _jsxs("p", { className: "mb-3 text-xs text-[var(--ma-muted)]", children: ["Di default questo dispositivo riceve la notifica per ", _jsx("strong", { children: "ogni" }), " mail del tenant. Per assegnargli solo alcune caselle (es. ", _jsx("em", { children: "fatturazione" }), ", ", _jsx("em", { children: "recruiting" }), "), indica qui le parti locali degli indirizzi (prima della @, separate da virgola): il dispositivo avr\u00E0 anche una vista \u00ABLe mie\u00BB con solo quelle mail."] }), loading ? (_jsx("p", { className: "text-xs text-[var(--ma-muted)]", children: "Caricamento\u2026" })) : (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-[var(--ma-muted)]", children: "Nome dispositivo (opzionale)" }), _jsx("input", { type: "text", value: label, onChange: (e) => setLabel(e.target.value), placeholder: "Es. Reception, Ufficio personale\u2026", className: "menuary-admin-input w-full text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-[var(--ma-muted)]", children: "Local part (separate da virgola)" }), _jsx("textarea", { value: localPartsRaw, onChange: (e) => setLocalPartsRaw(e.target.value), placeholder: "Es. fatturazione, prenotazioni", rows: 2, className: "menuary-admin-input w-full text-sm" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: handleSave, disabled: isPending, className: "menuary-admin-action-btn !px-3 !py-1.5 text-xs", children: "Salva" }), savedFilter && savedFilter.localParts.length > 0 && (_jsx("button", { type: "button", onClick: handleClear, disabled: isPending, className: cn("menuary-admin-nav-link !w-auto !px-3 !py-1.5 text-xs text-red-500"), children: "Rimuovi filtro" }))] })] }))] })] })] })] }));
}
//# sourceMappingURL=tenant-mail-device-settings.js.map