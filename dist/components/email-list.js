"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, Inbox, MessageSquareText, Paperclip, Star, Eye, MousePointerClick } from "lucide-react";
import { cn } from "../utils";
function fmtDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
    if (isToday) {
        return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}
const BRAND_STYLE = {
    menuary: { bg: "bg-[#a95f45]", ring: "ring-[#a95f45]/30" },
    bizery: { bg: "bg-[#3b6cb5]", ring: "ring-[#3b6cb5]/30" },
    orpheo: { bg: "bg-[#7c3aed]", ring: "ring-[#7c3aed]/30" },
    pynkstudio: { bg: "bg-[#d946a8]", ring: "ring-[#d946a8]/30" },
};
function initialFor(email) {
    const src = (email.from_name || email.from_address || "?").trim();
    return src.charAt(0).toUpperCase();
}
function deliveryIssueLabel(status) {
    if (status === "delivery_delayed")
        return "Ritardo";
    if (status === "bounced")
        return "Rimbalzata";
    if (status === "complained")
        return "Spam";
    return null;
}
export function EmailList({ emails, selectedId, onSelect, trackingMap, sentStatusMap, threadCountMap, threadUnreadMap, threadAttachmentMap }) {
    if (emails.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 text-center text-[var(--ma-muted)]", children: [_jsx(Inbox, { size: 28, className: "mb-2 opacity-40" }), _jsx("p", { className: "text-sm", children: "Nessuna email" })] }));
    }
    return (_jsx("ul", { className: "space-y-1.5 p-2", children: emails.map((email) => {
            const isSelected = email.id === selectedId;
            const threadCount = threadCountMap?.[email.id] ?? 1;
            const threadUnreadCount = threadUnreadMap?.[email.id] ?? (!email.read ? 1 : 0);
            const threadAttachmentCount = threadAttachmentMap?.[email.id] ?? email.attachments.length;
            const isUnread = threadUnreadCount > 0;
            const brand = BRAND_STYLE[email.brand] ?? { bg: "bg-gray-400", ring: "ring-gray-300" };
            const tracking = email.message_id && trackingMap ? trackingMap[email.message_id] : undefined;
            const deliveryIssue = deliveryIssueLabel(sentStatusMap?.[email.id]);
            return (_jsxs("li", { className: "relative", children: [isUnread && (_jsx("span", { "aria-hidden": true, className: "pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full bg-[var(--ma-accent)]" })), _jsx("button", { onClick: () => onSelect(email), className: cn("w-full rounded-2xl px-3.5 py-3 text-left transition-all", "hover:bg-white/70 hover:shadow-sm", isSelected
                            ? "bg-white shadow-[0_14px_36px_rgba(15,23,42,0.10)] ring-1 ring-black/5"
                            : "bg-transparent", isUnread && "pl-[calc(0.875rem+3px)]", deliveryIssue && "bg-red-50/60 ring-1 ring-red-100"), children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-offset-1 ring-offset-transparent", brand.bg, brand.ring), title: email.brand, children: initialFor(email) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: cn("truncate text-sm", isUnread
                                                        ? "font-semibold text-[var(--ma-ink)]"
                                                        : "text-[var(--ma-ink)]/80"), children: email.from_name ?? email.from_address }), _jsx("span", { className: cn("shrink-0 text-[11px] tabular-nums", isUnread ? "font-semibold text-[var(--ma-accent)]" : "text-[var(--ma-muted)]"), children: fmtDate(email.created_at) })] }), _jsxs("div", { className: "mt-0.5 flex items-center gap-1.5", children: [_jsx("p", { className: cn("min-w-0 flex-1 truncate text-sm", isUnread
                                                        ? "font-medium text-[var(--ma-ink)]"
                                                        : "text-[var(--ma-ink)]/75"), children: email.subject || "(nessun oggetto)" }), threadCount > 1 && (_jsxs("span", { className: "inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--ma-surface)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ma-muted)]", children: [_jsx(MessageSquareText, { size: 10 }), threadCount] })), deliveryIssue && (_jsxs("span", { className: "inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700", children: [_jsx(AlertTriangle, { size: 10 }), deliveryIssue] }))] }), _jsxs("div", { className: "mt-0.5 flex items-center gap-1.5", children: [_jsx("p", { className: "min-w-0 flex-1 truncate text-xs text-[var(--ma-muted)]", children: email.text_body?.slice(0, 120) ?? "" }), threadAttachmentCount > 0 && (_jsxs("span", { className: "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600", title: `${threadAttachmentCount} allegat${threadAttachmentCount === 1 ? "o" : "i"}`, children: [_jsx(Paperclip, { size: 10 }), threadAttachmentCount > 1 && threadAttachmentCount] })), tracking && tracking.openCount > 0 && (_jsxs("span", { className: "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600", title: `Aperta ${tracking.openCount} volt${tracking.openCount === 1 ? "a" : "e"}`, children: [_jsx(Eye, { size: 10 }), tracking.openCount > 1 && tracking.openCount] })), tracking && tracking.clickCount > 0 && (_jsxs("span", { className: "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600", title: `Link cliccato ${tracking.clickCount} volt${tracking.clickCount === 1 ? "a" : "e"}`, children: [_jsx(MousePointerClick, { size: 10 }), tracking.clickCount > 1 && tracking.clickCount] })), email.starred && (_jsx(Star, { size: 12, className: "shrink-0 fill-amber-400 text-amber-400" }))] })] })] }) })] }, email.id));
        }) }));
}
//# sourceMappingURL=email-list.js.map