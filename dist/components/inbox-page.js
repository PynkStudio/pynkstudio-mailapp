"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useTransition, useCallback } from "react";
import { Archive, Clapperboard, Inbox, RefreshCw, Star, UtensilsCrossed, Briefcase, Mail, } from "lucide-react";
import { cn } from "../utils";
import { markEmailRead, getInboundEmails, hydrateInboundEmailContent } from "../email/inbound-queries";
import { EmailList } from "./email-list";
import { EmailDetail } from "./email-detail";
const BRAND_TABS = [
    { value: "all", label: "Tutte", icon: Mail },
    { value: "menuary", label: "Menuary", icon: UtensilsCrossed },
    { value: "bizery", label: "Bizery", icon: Briefcase },
    { value: "orpheo", label: "Orpheo", icon: Clapperboard },
];
const VIEW_TABS = [
    { value: "inbox", label: "Arrivo", icon: Inbox },
    { value: "starred", label: "Stellate", icon: Star },
    { value: "archived", label: "Archivio", icon: Archive },
];
export function InboxPage({ initialData }) {
    const [data, setData] = useState(initialData);
    const [brandFilter, setBrandFilter] = useState("all");
    const [viewFilter, setViewFilter] = useState("inbox");
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [isPending, startTransition] = useTransition();
    const reload = useCallback((brand = brandFilter, view = viewFilter) => {
        startTransition(async () => {
            const filter = {
                brand: brand === "all" ? "all" : brand,
                onlyStarred: view === "starred",
                archived: view === "archived",
            };
            const fresh = await getInboundEmails(filter);
            setData(fresh);
        });
    }, [brandFilter, viewFilter]);
    function handleBrandFilter(b) {
        setBrandFilter(b);
        reload(b, viewFilter);
    }
    function handleViewFilter(v) {
        setViewFilter(v);
        reload(brandFilter, v);
    }
    async function handleSelectEmail(email) {
        setSelectedEmail(email);
        if (!email.read) {
            await markEmailRead(email.id, true);
            setData((prev) => ({
                ...prev,
                emails: prev.emails.map((e) => (e.id === email.id ? { ...e, read: true } : e)),
            }));
        }
        const hydrated = await hydrateInboundEmailContent(email.id);
        if (hydrated) {
            setSelectedEmail(hydrated);
            setData((prev) => ({
                ...prev,
                emails: prev.emails.map((e) => (e.id === hydrated.id ? hydrated : e)),
            }));
        }
    }
    const showDetail = selectedEmail !== null;
    return (_jsxs("div", { className: "menuary-admin-inbox", children: [_jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx("div", { className: "flex gap-1 rounded-xl border border-[var(--ma-line)] bg-[var(--ma-surface)] p-1", children: BRAND_TABS.map(({ value, label, icon: Icon }) => (_jsxs("button", { onClick: () => handleBrandFilter(value), className: cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", brandFilter === value
                                ? "bg-white text-[var(--ma-ink)] shadow-sm"
                                : "text-[var(--ma-muted)] hover:text-[var(--ma-ink)]"), children: [_jsx(Icon, { size: 14 }), label] }, value))) }), _jsx("div", { className: "flex gap-1 rounded-xl border border-[var(--ma-line)] bg-[var(--ma-surface)] p-1", children: VIEW_TABS.map(({ value, label, icon: Icon }) => (_jsxs("button", { onClick: () => handleViewFilter(value), className: cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", viewFilter === value
                                ? "bg-white text-[var(--ma-ink)] shadow-sm"
                                : "text-[var(--ma-muted)] hover:text-[var(--ma-ink)]"), children: [_jsx(Icon, { size: 14 }), label] }, value))) }), _jsx("div", { className: "flex-1" }), _jsxs("button", { onClick: () => reload(), disabled: isPending, className: "menuary-admin-nav-link !w-auto !px-3 !py-1.5 text-sm", title: "Aggiorna", children: [_jsx(RefreshCw, { size: 14, className: isPending ? "animate-spin" : "" }), _jsx("span", { className: "hidden sm:inline", children: "Aggiorna" })] })] }), _jsxs("p", { className: "mb-3 text-xs text-[var(--ma-muted)]", children: [data.total, " ", data.total === 1 ? "email" : "email", data.total > data.pageSize && ` · pagina ${data.page}`] }), _jsx("div", { className: "menuary-admin-card overflow-hidden p-0", children: _jsxs("div", { className: "flex h-[calc(100vh-220px)] min-h-96", children: [_jsx("div", { className: cn("h-full overflow-y-auto border-r border-[var(--ma-line)]", showDetail ? "hidden lg:block lg:w-72 xl:w-80" : "w-full"), children: _jsx(EmailList, { emails: data.emails, selectedId: selectedEmail?.id ?? null, onSelect: handleSelectEmail }) }), showDetail ? (_jsx("div", { className: "flex-1 overflow-hidden", children: _jsx(EmailDetail, { email: selectedEmail, onClose: () => setSelectedEmail(null), onMutated: () => reload() }) })) : (_jsx("div", { className: "hidden flex-1 items-center justify-center text-[var(--ma-muted)] lg:flex", children: _jsxs("div", { className: "text-center", children: [_jsx(Mail, { size: 36, className: "mx-auto mb-2 opacity-30" }), _jsx("p", { className: "text-sm", children: "Seleziona un'email" })] }) }))] }) })] }));
}
//# sourceMappingURL=inbox-page.js.map