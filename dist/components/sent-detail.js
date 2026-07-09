"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, Link2, Search, X } from "lucide-react";
import { cn } from "../utils";
import { getTrackingEventsForEmail } from "../email/tracking-queries";
import { TRACKING_EVENT_LABELS, TRACKING_EVENT_COLORS } from "../email/tracking-types";
import { findLeadsByEmails, searchLeads, linkSentEmailToLead, getLeadsByIds } from "../email/lead-link-queries";
import { buildEmailSrcDoc } from "../email/render-html";
const STATUS_BADGE = {
    sent: "bg-blue-50 text-blue-600",
    delivered: "bg-green-50 text-green-600",
    delivery_delayed: "bg-yellow-50 text-yellow-600",
    bounced: "bg-red-50 text-red-600",
    complained: "bg-orange-50 text-orange-600",
};
const STATUS_LABELS = {
    sent: "Inviata",
    delivered: "Consegnata",
    delivery_delayed: "Ritardo consegna",
    bounced: "Rimbalzata",
    complained: "Segnata spam",
};
const VERTICAL_LABELS = {
    food: "Menuary",
    services: "Bizery",
};
function fmtDate(iso) {
    return new Date(iso).toLocaleString("it-IT", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}
function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}
function deliveryIssueCopy(status, events) {
    const bounceEvent = [...events].reverse().find((event) => event.event_type === "email.bounced" || event.event_type === "email.complained");
    const bounce = bounceEvent?.metadata?.bounce;
    if (status === "delivery_delayed") {
        return {
            title: "Consegna in ritardo",
            body: "Resend ha segnalato un ritardo. La consegna potrebbe riuscire più tardi, ma conviene controllare il destinatario se resta in questo stato.",
        };
    }
    if (status === "bounced") {
        return {
            title: "Email rimbalzata",
            body: bounce?.message ?? "Il server del destinatario ha rifiutato il messaggio. Controlla l'indirizzo o usa un canale alternativo.",
        };
    }
    if (status === "complained") {
        return {
            title: "Segnata come spam",
            body: "Il destinatario o il provider ha classificato il messaggio come spam. Evita nuovi invii finché non hai verificato il contatto.",
        };
    }
    return null;
}
function LeadPanel({ emailId, linkedLeadId, autoMatches, onLinked }) {
    const [isPending, startTransition] = useTransition();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const [linkedLead, setLinkedLead] = useState(null);
    const searchRef = useRef(null);
    useEffect(() => {
        if (!linkedLeadId) {
            setLinkedLead(null);
            return;
        }
        if (linkedLead?.id === linkedLeadId)
            return;
        let cancelled = false;
        getLeadsByIds([linkedLeadId])
            .then((rows) => { if (!cancelled)
            setLinkedLead(rows[0] ?? null); })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [linkedLeadId, linkedLead?.id]);
    function handleSearch(q) {
        setSearchQuery(q);
        if (searchRef.current)
            clearTimeout(searchRef.current);
        if (!q.trim()) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        searchRef.current = setTimeout(async () => {
            try {
                const r = await searchLeads(q);
                setSearchResults(r);
            }
            finally {
                setSearching(false);
            }
        }, 300);
    }
    function handleLink(leadId) {
        startTransition(async () => {
            await linkSentEmailToLead(emailId, leadId);
            onLinked(leadId);
            setOpen(false);
            setSearchQuery("");
            setSearchResults([]);
        });
    }
    const displayResults = searchQuery.trim() ? searchResults : autoMatches;
    return (_jsxs("div", { className: "border-b border-[var(--ma-line)] px-5 py-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-[var(--ma-muted)]", children: "Lead collegato" }), _jsxs("button", { onClick: () => setOpen((v) => !v), className: "menuary-admin-nav-link !w-auto !px-2 !py-1 text-xs gap-1", children: [_jsx(Link2, { size: 12 }), linkedLeadId ? "Cambia" : "Collega"] })] }), linkedLeadId ? (_jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx("span", { className: "flex-1 rounded-lg bg-[var(--ma-surface)] px-3 py-1.5 text-sm font-medium text-[var(--ma-ink)]", children: linkedLead ? (_jsxs(_Fragment, { children: [linkedLead.business_name, _jsxs("span", { className: "ml-1 text-xs font-normal text-[var(--ma-muted)]", children: ["\u00B7 ", linkedLead.contact_name || linkedLead.contact_email] })] })) : (_jsx("span", { className: "text-[var(--ma-muted)]", children: "Caricamento\u2026" })) }), _jsx("button", { onClick: () => handleLink(null), disabled: isPending, className: "menuary-admin-nav-link !w-auto !px-2 !py-1 text-xs text-red-500", title: "Scollega", children: _jsx(X, { size: 12 }) })] })) : (_jsx("p", { className: "mt-1 text-xs text-[var(--ma-muted)]", children: "Nessun lead collegato" })), open && (_jsxs("div", { className: "mt-2 space-y-1.5", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { size: 13, className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ma-muted)]" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => handleSearch(e.target.value), placeholder: "Cerca per nome o email\u2026", className: "menuary-admin-input w-full !pl-8 !py-1.5 text-sm" })] }), searching && _jsx("p", { className: "text-xs text-[var(--ma-muted)]", children: "Ricerca\u2026" }), displayResults.length > 0 && (_jsx("ul", { className: "rounded-lg border border-[var(--ma-line)] bg-[var(--ma-paper)] divide-y divide-[var(--ma-line)] overflow-hidden", children: displayResults.map((lead) => (_jsx("li", { children: _jsxs("button", { onClick: () => handleLink(lead.id), disabled: isPending, className: "w-full px-3 py-2 text-left hover:bg-[var(--ma-surface)] transition-colors", children: [_jsx("span", { className: "block text-sm font-medium text-[var(--ma-ink)]", children: lead.business_name }), _jsxs("span", { className: "block text-xs text-[var(--ma-muted)]", children: [lead.contact_name, " \u00B7 ", lead.contact_email, " \u00B7", " ", lead.business_vertical ? (VERTICAL_LABELS[lead.business_vertical] ?? lead.business_vertical) : "N/D"] })] }) }, lead.id))) })), !searching && searchQuery.trim() && searchResults.length === 0 && (_jsx("p", { className: "text-xs text-[var(--ma-muted)]", children: "Nessun lead trovato" }))] }))] }));
}
// ─── SentDetail ───────────────────────────────────────────────────────────────
export function SentDetail({ email, onClose }) {
    const [events, setEvents] = useState([]);
    const [linkedLeadId, setLinkedLeadId] = useState(email.lead_id);
    const [autoMatches, setAutoMatches] = useState([]);
    const iframeRef = useRef(null);
    useEffect(() => {
        if (!email.resend_message_id)
            return;
        getTrackingEventsForEmail(email.resend_message_id)
            .then(setEvents)
            .catch(console.error);
    }, [email.resend_message_id]);
    // Auto-match dal primo destinatario (email in uscita)
    useEffect(() => {
        const first = email.to_addresses[0];
        if (!first)
            return;
        findLeadsByEmails([first])
            .then(setAutoMatches)
            .catch(() => { });
    }, [email.to_addresses]);
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe)
            return;
        function resize() {
            try {
                const h = iframe.contentDocument?.documentElement?.scrollHeight;
                if (h && h > 0)
                    iframe.style.height = `${h + 16}px`;
            }
            catch { }
        }
        iframe.addEventListener("load", resize);
        return () => iframe.removeEventListener("load", resize);
    }, [email.html_body]);
    const displayFrom = email.from_name
        ? `${email.from_name} <${email.from_address}>`
        : email.from_address;
    const issue = deliveryIssueCopy(email.status, events);
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-[var(--ma-line)] px-5 py-3", children: [_jsxs("button", { onClick: onClose, className: "menuary-admin-nav-link mr-2 !w-auto gap-1.5 !px-2 !py-1.5 text-sm", children: [_jsx(ArrowLeft, { size: 15 }), _jsx("span", { className: "hidden sm:inline", children: "Indietro" })] }), _jsx("div", { className: "flex-1" }), _jsx("button", { onClick: onClose, className: "menuary-admin-nav-link !w-auto !px-2 !py-1.5 lg:hidden", children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "border-b border-[var(--ma-line)] px-5 py-4", children: [_jsxs("div", { className: "mb-2 flex flex-wrap items-start gap-2", children: [_jsx("h2", { className: "flex-1 text-lg font-semibold text-[var(--ma-ink)] leading-snug", children: email.subject || "(nessun oggetto)" }), _jsx("span", { className: cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", STATUS_BADGE[email.status]), children: STATUS_LABELS[email.status] })] }), _jsxs("div", { className: "flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--ma-muted)]", children: [_jsxs("span", { children: [_jsx("span", { className: "font-medium text-[var(--ma-ink)]", children: "Da:" }), " ", displayFrom] }), _jsxs("span", { children: [_jsx("span", { className: "font-medium text-[var(--ma-ink)]", children: "A:" }), " ", email.to_addresses.join(", ")] }), _jsx("span", { children: fmtDate(email.created_at) })] })] }), issue && (_jsx("div", { className: "border-b border-red-200 bg-red-50 px-5 py-3 text-red-800", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(AlertTriangle, { size: 17, className: "mt-0.5 shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold", children: issue.title }), _jsx("p", { className: "mt-0.5 text-xs leading-relaxed text-red-700", children: issue.body })] })] }) })), events.length > 0 && (_jsxs("div", { className: "border-b border-[var(--ma-line)] px-5 py-3", children: [_jsx("p", { className: "mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ma-muted)]", children: "Tracking" }), _jsx("div", { className: "flex flex-wrap gap-2", children: events.map((ev) => {
                            const label = TRACKING_EVENT_LABELS[ev.event_type] ?? ev.event_type;
                            const color = TRACKING_EVENT_COLORS[ev.event_type] ?? "bg-gray-50 text-gray-600";
                            const meta = ev.metadata;
                            const clickLink = meta.click && typeof meta.click === "object"
                                ? String(meta.click.link ?? "")
                                : "";
                            return (_jsxs("div", { className: cn("rounded-lg px-2.5 py-1.5 text-xs", color), children: [_jsx("span", { className: "font-medium", children: label }), _jsx("span", { className: "ml-1.5 opacity-70", children: fmtTime(ev.created_at) }), clickLink && (_jsx("span", { className: "ml-1.5 max-w-[140px] truncate align-bottom opacity-70 inline-block", children: clickLink }))] }, ev.id));
                        }) })] })), _jsx(LeadPanel, { emailId: email.id, linkedLeadId: linkedLeadId, autoMatches: autoMatches, onLinked: setLinkedLeadId }), _jsx("div", { className: "flex-1 overflow-y-auto p-5", children: email.html_body ? (_jsx("iframe", { ref: iframeRef, srcDoc: buildEmailSrcDoc(email.html_body), className: "w-full rounded-lg border border-[var(--ma-line)]", style: { minHeight: "400px", height: "400px" }, sandbox: "allow-same-origin allow-popups allow-popups-to-escape-sandbox", title: "Corpo email" })) : (_jsx("p", { className: "text-sm text-[var(--ma-muted)]", children: "(Nessun contenuto)" })) })] }));
}
//# sourceMappingURL=sent-detail.js.map