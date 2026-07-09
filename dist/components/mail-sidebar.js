"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { Archive, Briefcase, Clapperboard, Heart, Inbox, LifeBuoy, Mail, MailOpen, Pencil, Send, Settings, ShieldAlert, Star, UtensilsCrossed, UserCheck, } from "lucide-react";
import { cn } from "../utils";
const VIEWS = [
    { value: "inbox", label: "Arrivo", icon: Inbox },
    { value: "unread", label: "Non lette", icon: MailOpen },
    { value: "mine", label: "Le mie", icon: UserCheck },
    { value: "sent", label: "Inviata", icon: Send },
    { value: "starred", label: "Stellate", icon: Star },
    { value: "spam", label: "Spam", icon: ShieldAlert },
    { value: "archived", label: "Archivio", icon: Archive },
];
const BRANDS = [
    { value: "all", label: "Tutte", icon: Mail },
    { value: "pynkstudio", label: "PynkStudio", icon: Heart },
    { value: "menuary", label: "Menuary", icon: UtensilsCrossed },
    { value: "bizery", label: "Bizery", icon: Briefcase },
    { value: "orpheo", label: "Orpheo", icon: Clapperboard },
    { value: "support", label: "Supporto", icon: LifeBuoy },
];
export function MailSidebar({ view, brand, unreadCount, unreadMine, canCompose, mode = "platform", mineAvailable = true, onViewChange, onBrandChange, onCompose, onOpenDeviceSettings }) {
    const views = VIEWS.filter((item) => item.value !== "mine" || mineAvailable);
    return (_jsxs("div", { className: "flex h-full w-52 shrink-0 flex-col border-r border-black/10 bg-white/55 p-3 backdrop-blur-xl", children: [canCompose && (_jsxs("button", { onClick: onCompose, className: "menuary-admin-action-btn mb-4 flex w-full items-center justify-center gap-2", children: [_jsx(Pencil, { size: 14 }), "Scrivi"] })), _jsx("p", { className: "mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ma-muted)]", children: "Cassetta" }), _jsx("nav", { className: "mb-4 space-y-0.5", children: views.map(({ value, label, icon: Icon }) => (_jsxs("button", { onClick: () => onViewChange(value), className: cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all", view === value
                        ? "bg-white text-[var(--ma-ink)] shadow-sm ring-1 ring-black/5"
                        : "text-[var(--ma-muted)] hover:bg-white/65 hover:text-[var(--ma-ink)]"), children: [_jsx(Icon, { size: 15 }), label, (value === "inbox" || value === "unread") && unreadCount > 0 && (_jsx("span", { className: cn("ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold", view === value ? "bg-[var(--ma-accent)]/10 text-[var(--ma-accent)]" : "bg-[var(--ma-accent)] text-white"), children: unreadCount })), value === "mine" && unreadMine > 0 && (_jsx("span", { className: cn("ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold", view === "mine" ? "bg-[var(--ma-accent)]/10 text-[var(--ma-accent)]" : "bg-[var(--ma-accent)] text-white"), children: unreadMine }))] }, value))) }), mode === "platform" && (_jsxs(_Fragment, { children: [_jsx("p", { className: "mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ma-muted)]", children: "Brand" }), _jsx("nav", { className: "mb-4 space-y-0.5", children: BRANDS.map(({ value, label, icon: Icon }) => (_jsxs("button", { onClick: () => onBrandChange(value), className: cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors", brand === value
                                ? "bg-white text-[var(--ma-ink)] shadow-sm ring-1 ring-black/5"
                                : "text-[var(--ma-muted)] hover:bg-white/65 hover:text-[var(--ma-ink)]"), children: [_jsx(Icon, { size: 15 }), label] }, value))) })] })), _jsxs("div", { className: "mt-auto", children: [mode === "platform" && (_jsxs(Link, { href: "/admin/profilo", className: "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[var(--ma-muted)] transition-colors hover:bg-white/65 hover:text-[var(--ma-ink)]", children: [_jsx(Settings, { size: 15 }), "Profilo e firma"] })), mode === "tenant" && onOpenDeviceSettings && (_jsxs("button", { type: "button", onClick: onOpenDeviceSettings, className: "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[var(--ma-muted)] transition-colors hover:bg-white/65 hover:text-[var(--ma-ink)]", children: [_jsx(Settings, { size: 15 }), "Questo dispositivo"] }))] })] }));
}
//# sourceMappingURL=mail-sidebar.js.map