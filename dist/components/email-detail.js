"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useTransition, useEffect, useRef } from "react";
import { Archive, ArrowLeft, Download, ExternalLink, File, FileText, ImageIcon, Link2, Paperclip, Reply, Search, ShieldAlert, ShieldCheck, Star, Trash2, UserCheck, X } from "lucide-react";
import { cn } from "../utils";
import { markEmailRead, starEmail, archiveEmail, deleteEmail, assignEmail, markEmailSpam } from "../email/inbound-queries";
import { findLeadsByEmails, searchLeads, linkInboundEmailToLead, getLeadsByIds } from "../email/lead-link-queries";
import { getSiteadminForAssignment } from "../email/assignment-queries";
import { buildEmailSrcDoc } from "../email/render-html";
const BRAND_COMPANY_DOMAINS = {
    menuary: "menuary.it",
    bizery: "bizery.it",
    orpheo: "weuseorpheo.com",
    pynkstudio: "pynkstudio.it",
};
function formatAssigneeName(a) {
    const full = [a.first_name, a.last_name].filter(Boolean).join(" ").trim();
    return full || a.display_name?.trim() || a.email;
}
function localPartFromName(a, b) {
    const local = [a, b]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "");
    return local || null;
}
function companyEmailForAssignee(assignee, brand) {
    const domain = BRAND_COMPANY_DOMAINS[brand];
    const [profileLocal, profileDomain] = assignee.email.split("@");
    if (profileLocal && profileDomain?.toLowerCase() === domain.toLowerCase()) {
        return `${profileLocal}@${domain}`;
    }
    const local = localPartFromName(assignee.first_name, assignee.last_name)
        || localPartFromName(assignee.display_name, null)
        || profileLocal
            ?.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ".")
            .replace(/^\.+|\.+$/g, "");
    return `${local || "team"}@${domain}`;
}
function fmtDate(iso) {
    return new Date(iso).toLocaleString("it-IT", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}
function fmtSize(size) {
    if (!size)
        return null;
    if (size < 1024 * 1024)
        return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
const BRAND_BADGE = {
    menuary: "bg-[#a95f45]/12 text-[#743d2f]",
    bizery: "bg-[#3b6cb5]/12 text-[#234a85]",
    orpheo: "bg-[#7c3aed]/12 text-[#4c1d95]",
};
const VERTICAL_LABELS = {
    food: "Menuary",
    services: "Bizery",
    creative: "Orpheo",
};
/** Converte URL in testo plain in link cliccabili. */
function linkifyText(text) {
    const urlRe = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRe);
    return parts.map((part, i) => urlRe.test(part) ? (_jsx("a", { href: part, target: "_blank", rel: "noopener noreferrer", className: "text-[var(--ma-accent)] underline underline-offset-2 break-all", children: part }, i)) : (part));
}
function PlainTextEmail({ text }) {
    return (_jsx("div", { className: "space-y-1 text-sm leading-relaxed text-[var(--ma-ink)]", children: text.split(/\r?\n/).map((line, i) => {
            const match = line.match(/^(>+)\s?(.*)$/);
            const depth = Math.min(match?.[1].length ?? 0, 4);
            return (_jsx("div", { className: cn("min-h-[1em] whitespace-pre-wrap", depth > 0 && "border-l-2 border-[var(--ma-line)] pl-3 text-[var(--ma-muted)]"), style: depth > 0 ? { marginLeft: `${(depth - 1) * 14}px` } : undefined, children: linkifyText(match?.[2] ?? line) }, i));
        }) }));
}
function base64ToBlob(content, contentType) {
    const binary = window.atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1)
        bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: contentType });
}
function attachmentSrc(att) {
    if (att.content) {
        return `data:${att.content_type ?? "application/octet-stream"};base64,${att.content}`;
    }
    return att.download_url ?? null;
}
function textFromBase64(content) {
    try {
        const binary = window.atob(content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1)
            bytes[i] = binary.charCodeAt(i);
        return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
    catch {
        return null;
    }
}
function openAttachment(att) {
    if (!att.content && att.download_url) {
        window.open(att.download_url, "_blank", "noopener,noreferrer");
        return;
    }
    if (!att.content)
        return;
    const blob = base64ToBlob(att.content, att.content_type ?? "application/octet-stream");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function downloadAttachment(att, fallbackName) {
    if (!att.content && att.download_url) {
        window.open(att.download_url, "_blank", "noopener,noreferrer");
        return;
    }
    if (!att.content)
        return;
    const blob = base64ToBlob(att.content, att.content_type ?? "application/octet-stream");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.filename ?? fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
function AttachmentInlinePreview({ att, index }) {
    const name = att.filename ?? `allegato-${index + 1}`;
    const type = att.content_type ?? "application/octet-stream";
    const src = attachmentSrc(att);
    const size = fmtSize(att.size);
    const canOpen = Boolean(att.content || att.download_url);
    const isImage = type.startsWith("image/");
    const isPdf = type === "application/pdf";
    const isText = type.startsWith("text/") || type === "application/json";
    const textPreview = isText && att.content ? textFromBase64(att.content) : null;
    const Icon = isImage ? ImageIcon : isPdf || isText ? FileText : File;
    return (_jsxs("div", { className: "overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-black/10 bg-slate-50/80 px-3 py-2", children: [_jsx("span", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--ma-muted)] shadow-sm ring-1 ring-black/5", children: _jsx(Icon, { size: 15 }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-semibold text-[var(--ma-ink)]", children: name }), _jsxs("p", { className: "truncate text-[11px] text-[var(--ma-muted)]", children: [type, size ? ` · ${size}` : ""] })] }), _jsx("button", { type: "button", onClick: () => openAttachment(att), disabled: !canOpen, className: "rounded-full p-1.5 text-[var(--ma-muted)] transition-colors hover:bg-white hover:text-[var(--ma-ink)] disabled:opacity-40", title: "Apri allegato", children: _jsx(ExternalLink, { size: 14 }) }), _jsx("button", { type: "button", onClick: () => downloadAttachment(att, name), disabled: !canOpen, className: "rounded-full p-1.5 text-[var(--ma-muted)] transition-colors hover:bg-white hover:text-[var(--ma-ink)] disabled:opacity-40", title: "Scarica allegato", children: _jsx(Download, { size: 14 }) })] }), src && isImage ? (_jsx("div", { className: "bg-slate-100", children: _jsx("img", { src: src, alt: name, className: "max-h-[520px] w-full object-contain" }) })) : src && isPdf ? (_jsx("iframe", { src: src, title: name, className: "h-[520px] w-full bg-white" })) : textPreview ? (_jsx("pre", { className: "max-h-80 overflow-auto whitespace-pre-wrap bg-slate-950 p-4 text-xs leading-relaxed text-slate-100", children: textPreview })) : (_jsx("div", { className: "px-4 py-6 text-sm text-[var(--ma-muted)]", children: "Anteprima non disponibile per questo formato." }))] }));
}
function HtmlEmailFrame({ html }) {
    const iframeRef = useRef(null);
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
    }, [html]);
    return (_jsx("iframe", { ref: iframeRef, srcDoc: buildEmailSrcDoc(html), className: "w-full rounded-2xl border border-black/10 bg-white shadow-sm", style: { minHeight: "360px", height: "400px" }, sandbox: "allow-same-origin allow-popups allow-popups-to-escape-sandbox", title: "Corpo email" }));
}
function EmailMessageBody({ message }) {
    return (_jsxs("div", { className: "space-y-4", children: [message.html_body ? (_jsx(HtmlEmailFrame, { html: message.html_body })) : message.text_body ? (_jsx("div", { className: "rounded-2xl border border-black/10 bg-white p-4 shadow-sm", children: _jsx(PlainTextEmail, { text: message.text_body }) })) : (_jsx("p", { className: "rounded-2xl border border-dashed border-black/10 bg-white/70 p-4 text-sm text-[var(--ma-muted)]", children: "(Nessun contenuto)" })), message.attachments.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ma-muted)]", children: [_jsx(Paperclip, { size: 13 }), "Allegati"] }), message.attachments.map((att, i) => (_jsx(AttachmentInlinePreview, { att: att, index: i }, `${att.filename ?? "attachment"}-${i}`)))] }))] }));
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
            await linkInboundEmailToLead(emailId, leadId);
            onLinked(leadId);
            setOpen(false);
            setSearchQuery("");
            setSearchResults([]);
        });
    }
    const displayResults = searchQuery.trim() ? searchResults : autoMatches;
    const leadLabel = linkedLead
        ? linkedLead.business_name
        : linkedLeadId
            ? "Lead collegato"
            : "Lead";
    return (_jsxs("div", { className: "relative inline-flex", children: [_jsxs("button", { onClick: () => setOpen((v) => !v), className: cn("inline-flex max-w-[220px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", linkedLeadId
                    ? "border-[var(--ma-accent)]/20 bg-[var(--ma-accent)]/8 text-[var(--ma-ink)]"
                    : "border-black/10 bg-white/70 text-[var(--ma-muted)] hover:bg-white hover:text-[var(--ma-ink)]"), title: linkedLead ? `Lead collegato: ${linkedLead.business_name}` : "Collega lead", children: [_jsx(Link2, { size: 12 }), _jsx("span", { className: "truncate", children: leadLabel })] }), open && (_jsxs("div", { className: "absolute right-0 top-8 z-20 w-80 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.16)]", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-[var(--ma-muted)]", children: "Lead collegato" }), linkedLeadId && (_jsxs("button", { onClick: () => handleLink(null), disabled: isPending, className: "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50", title: "Scollega", children: [_jsx(X, { size: 12 }), "Scollega"] }))] }), linkedLeadId && (_jsx("div", { className: "mb-2 rounded-xl bg-[var(--ma-surface)] px-3 py-2 text-sm font-medium text-[var(--ma-ink)]", children: linkedLead ? (_jsxs(_Fragment, { children: [linkedLead.business_name, _jsx("span", { className: "mt-0.5 block truncate text-xs font-normal text-[var(--ma-muted)]", children: linkedLead.contact_name || linkedLead.contact_email })] })) : (_jsx("span", { className: "text-[var(--ma-muted)]", children: "Caricamento..." })) })), _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 13, className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ma-muted)]" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => handleSearch(e.target.value), placeholder: "Cerca per nome o email...", className: "menuary-admin-input w-full !pl-8 !py-1.5 text-sm" })] }), searching && (_jsx("p", { className: "mt-2 text-xs text-[var(--ma-muted)]", children: "Ricerca..." })), displayResults.length > 0 && (_jsx("ul", { className: "mt-2 max-h-72 overflow-y-auto rounded-xl border border-[var(--ma-line)] bg-[var(--ma-paper)] divide-y divide-[var(--ma-line)]", children: displayResults.map((lead) => (_jsx("li", { children: _jsxs("button", { onClick: () => handleLink(lead.id), disabled: isPending, className: "w-full px-3 py-2 text-left transition-colors hover:bg-[var(--ma-surface)]", children: [_jsx("span", { className: "block truncate text-sm font-medium text-[var(--ma-ink)]", children: lead.business_name }), _jsxs("span", { className: "block truncate text-xs text-[var(--ma-muted)]", children: [lead.contact_name, " \u00B7 ", lead.contact_email, " \u00B7", " ", lead.business_vertical ? (VERTICAL_LABELS[lead.business_vertical] ?? lead.business_vertical) : "N/D"] })] }) }, lead.id))) })), !searching && searchQuery.trim() && searchResults.length === 0 && (_jsx("p", { className: "mt-2 text-xs text-[var(--ma-muted)]", children: "Nessun lead trovato" }))] }))] }));
}
function AssignPanel({ emailId, assignedToUserId, brand, onAssigned }) {
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getSiteadminForAssignment()
            .then((u) => { if (!cancelled)
            setUsers(u); })
            .catch(() => { })
            .finally(() => { if (!cancelled)
            setLoading(false); });
        return () => { cancelled = true; };
    }, []);
    function handleAssign(siteadminId) {
        startTransition(async () => {
            await assignEmail(emailId, siteadminId);
            onAssigned(emailId, siteadminId);
            setOpen(false);
        });
    }
    const currentUser = users.find((u) => u.id === assignedToUserId);
    const currentName = currentUser ? formatAssigneeName(currentUser) : assignedToUserId ? "Assegnata" : "Assegna";
    const currentCompanyEmail = currentUser ? companyEmailForAssignee(currentUser, brand) : null;
    return (_jsxs("div", { className: "relative inline-flex", children: [_jsxs("button", { onClick: () => setOpen((v) => !v), className: cn("inline-flex max-w-[220px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", assignedToUserId
                    ? "border-[var(--ma-accent)]/20 bg-[var(--ma-accent)]/8 text-[var(--ma-ink)]"
                    : "border-black/10 bg-white/70 text-[var(--ma-muted)] hover:bg-white hover:text-[var(--ma-ink)]"), title: currentCompanyEmail ? `${currentName} · ${currentCompanyEmail}` : "Assegna mail", children: [_jsx(UserCheck, { size: 12 }), _jsx("span", { className: "truncate", children: currentName })] }), open && (_jsxs("div", { className: "absolute right-0 top-8 z-20 w-80 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.16)]", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-[var(--ma-muted)]", children: "Assegnata a" }), assignedToUserId && (_jsxs("button", { onClick: () => handleAssign(null), disabled: isPending, className: "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50", title: "Rimuovi assegnazione", children: [_jsx(X, { size: 12 }), "Rimuovi"] }))] }), currentUser && (_jsxs("div", { className: "mb-2 rounded-xl bg-[var(--ma-surface)] px-3 py-2", children: [_jsx("p", { className: "truncate text-sm font-semibold text-[var(--ma-ink)]", children: formatAssigneeName(currentUser) }), _jsx("p", { className: "truncate text-xs text-[var(--ma-muted)]", children: companyEmailForAssignee(currentUser, brand) })] })), loading && _jsx("p", { className: "text-xs text-[var(--ma-muted)]", children: "Caricamento..." }), !loading && users.length > 0 && (_jsx("ul", { className: "max-h-72 overflow-y-auto rounded-xl border border-[var(--ma-line)] bg-[var(--ma-paper)] divide-y divide-[var(--ma-line)]", children: users.map((user) => {
                            const companyEmail = companyEmailForAssignee(user, brand);
                            return (_jsx("li", { children: _jsxs("button", { onClick: () => handleAssign(user.id), disabled: isPending, className: cn("w-full px-3 py-2 text-left transition-colors", user.id === assignedToUserId
                                        ? "bg-[var(--ma-accent)]/10"
                                        : "hover:bg-[var(--ma-surface)]"), children: [_jsx("span", { className: "block truncate text-sm font-medium text-[var(--ma-ink)]", children: formatAssigneeName(user) }), _jsxs("span", { className: "block truncate text-xs text-[var(--ma-muted)]", children: [companyEmail, " \u00B7 ", user.role] })] }) }, user.id));
                        }) }))] }))] }));
}
// ─── EmailDetail ──────────────────────────────────────────────────────────────
export function EmailDetail({ email, threadEmails, onClose, onMutated, onReply, onAssigned, mode = "platform", scope }) {
    const [isPending, startTransition] = useTransition();
    const [starred, setStarred] = useState(email.starred);
    const [assignedUserId, setAssignedUserId] = useState(email.assigned_to_user_id);
    const [linkedLeadId, setLinkedLeadId] = useState(email.lead_id);
    const [autoMatches, setAutoMatches] = useState([]);
    const messages = [...(threadEmails?.length ? threadEmails : [email])]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const threadAttachmentCount = messages.reduce((sum, item) => sum + item.attachments.length, 0);
    useEffect(() => {
        setStarred(email.starred);
        setAssignedUserId(email.assigned_to_user_id);
        setLinkedLeadId(email.lead_id);
    }, [email.id, email.starred, email.assigned_to_user_id, email.lead_id]);
    // Auto-match lead dal mittente
    useEffect(() => {
        if (mode !== "platform")
            return;
        findLeadsByEmails([email.from_address])
            .then(setAutoMatches)
            .catch(() => { });
    }, [email.from_address, mode]);
    function handleStar() {
        const next = !starred;
        setStarred(next);
        startTransition(async () => {
            await starEmail(email.id, next, scope);
            onMutated();
        });
    }
    function handleArchive() {
        startTransition(async () => {
            await archiveEmail(email.id, scope);
            onClose();
            onMutated();
        });
    }
    function handleDelete() {
        if (!confirm("Eliminare definitivamente questa email?"))
            return;
        startTransition(async () => {
            await deleteEmail(email.id, scope);
            onClose();
            onMutated();
        });
    }
    function handleSpam() {
        if (!email.spam &&
            !confirm("Segnare come spam? Le prossime email di questo mittente finiranno automaticamente nello spam.")) {
            return;
        }
        startTransition(async () => {
            await markEmailSpam(email.id, !email.spam, scope);
            onClose();
            onMutated();
        });
    }
    function handleMarkUnread() {
        startTransition(async () => {
            await markEmailRead(email.id, false, scope);
            onMutated();
        });
    }
    const displayFrom = email.from_name
        ? `${email.from_name} <${email.from_address}>`
        : email.from_address;
    return (_jsxs("div", { className: "flex h-full flex-col bg-white/65 backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-black/10 bg-white/75 px-5 py-3 backdrop-blur-xl", children: [_jsxs("button", { onClick: onClose, className: "menuary-admin-nav-link mr-2 !w-auto gap-1.5 !px-2 !py-1.5 text-sm", children: [_jsx(ArrowLeft, { size: 15 }), _jsx("span", { className: "hidden sm:inline", children: "Indietro" })] }), _jsx("button", { onClick: handleStar, disabled: isPending, className: cn("menuary-admin-nav-link !w-auto !px-2 !py-1.5", starred && "text-yellow-500"), title: starred ? "Rimuovi stella" : "Aggiungi stella", children: _jsx(Star, { size: 16, fill: starred ? "currentColor" : "none" }) }), _jsx("button", { onClick: handleMarkUnread, disabled: isPending, className: "menuary-admin-nav-link !w-auto !px-2 !py-1.5 text-xs", title: "Segna come non letta", children: "Non letta" }), _jsx("div", { className: "flex-1" }), onReply && (_jsx("button", { onClick: () => onReply(email), className: "menuary-admin-nav-link !w-auto !px-2 !py-1.5", title: "Rispondi", children: _jsx(Reply, { size: 16 }) })), _jsx("button", { onClick: handleSpam, disabled: isPending, className: cn("menuary-admin-nav-link !w-auto !px-2 !py-1.5", email.spam ? "text-emerald-600" : "text-orange-500"), title: email.spam ? "Non è spam: sblocca il mittente" : "Segna come spam e blocca il mittente", children: email.spam ? _jsx(ShieldCheck, { size: 16 }) : _jsx(ShieldAlert, { size: 16 }) }), _jsx("button", { onClick: handleArchive, disabled: isPending, className: "menuary-admin-nav-link !w-auto !px-2 !py-1.5", title: "Archivia", children: _jsx(Archive, { size: 16 }) }), _jsx("button", { onClick: handleDelete, disabled: isPending, className: "menuary-admin-nav-link !w-auto !px-2 !py-1.5 text-red-500", title: "Elimina", children: _jsx(Trash2, { size: 16 }) }), _jsx("button", { onClick: onClose, className: "menuary-admin-nav-link !w-auto !px-2 !py-1.5 lg:hidden", children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "border-b border-black/10 bg-white/60 px-5 py-4", children: [_jsxs("div", { className: "mb-2 flex flex-wrap items-start gap-2", children: [_jsx("h2", { className: "flex-1 text-xl font-semibold tracking-[-0.01em] text-[var(--ma-ink)] leading-snug", children: email.subject || "(nessun oggetto)" }), _jsx("span", { className: cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", BRAND_BADGE[email.brand] ?? "bg-gray-100 text-gray-600"), children: email.brand })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--ma-muted)]", children: [_jsxs("span", { children: [_jsx("span", { className: "font-medium text-[var(--ma-ink)]", children: "Da:" }), " ", displayFrom] }), _jsxs("span", { children: [_jsx("span", { className: "font-medium text-[var(--ma-ink)]", children: "A:" }), " ", email.to_addresses.join(", ")] }), _jsx("span", { children: fmtDate(email.created_at) })] }), (messages.length > 1 || threadAttachmentCount > 0 || mode === "platform") && (_jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--ma-muted)]", children: [messages.length > 1 && (_jsxs("span", { className: "rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-black/5", children: [messages.length, " messaggi nel thread"] })), threadAttachmentCount > 0 && (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-black/5", children: [_jsx(Paperclip, { size: 12 }), threadAttachmentCount, " allegat", threadAttachmentCount === 1 ? "o" : "i"] })), mode === "platform" && (_jsxs(_Fragment, { children: [_jsx(AssignPanel, { emailId: email.id, assignedToUserId: assignedUserId, brand: email.brand, onAssigned: (id, sid) => {
                                            setAssignedUserId(sid);
                                            onAssigned?.(id, sid);
                                        } }), _jsx(LeadPanel, { emailId: email.id, linkedLeadId: linkedLeadId, autoMatches: autoMatches, onLinked: setLinkedLeadId })] }))] }))] }), _jsx("div", { className: "flex-1 overflow-y-auto bg-[var(--ma-surface)]/35 p-5", children: _jsx("div", { className: "mx-auto max-w-4xl space-y-4", children: messages.map((message) => {
                        const from = message.from_name
                            ? `${message.from_name} <${message.from_address}>`
                            : message.from_address;
                        return (_jsxs("article", { className: "rounded-[1.35rem] border border-black/10 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl", children: [_jsxs("div", { className: "mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-semibold text-[var(--ma-ink)]", children: from }), _jsxs("p", { className: "mt-0.5 truncate text-xs text-[var(--ma-muted)]", children: ["A: ", message.to_addresses.join(", ")] })] }), _jsx("time", { className: "shrink-0 text-xs font-medium text-[var(--ma-muted)]", children: fmtDate(message.created_at) })] }), _jsx(EmailMessageBody, { message: message })] }, message.id));
                    }) }) })] }));
}
//# sourceMappingURL=email-detail.js.map