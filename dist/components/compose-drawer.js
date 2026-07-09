"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useTransition, useRef, useCallback } from "react";
import { useDraftPersistence } from "../hooks/use-draft-persistence";
import { useUnsavedChangesWarning } from "../hooks/use-unsaved-changes-warning";
import { Bold, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered, Paperclip, Quote, Send, Trash2, Underline, X } from "lucide-react";
import { cn } from "../utils";
const MAX_ATTACHMENT_MB = 8;
const MAX_TOTAL_MB = 20;
const EMPTY_EDITOR_HTML = "<p><br></p>";
function fmtSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
async function fileToAttachment(file) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i]);
    const content = btoa(binary);
    return {
        filename: file.name,
        content,
        contentType: file.type || undefined,
        size: file.size,
    };
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function plainTextToHtml(text) {
    if (!text.trim())
        return EMPTY_EDITOR_HTML;
    const lines = text.split(/\r?\n/);
    let html = "";
    let quoteDepth = 0;
    for (const line of lines) {
        const match = line.match(/^(>+)\s?(.*)$/);
        const depth = Math.min(match?.[1].length ?? 0, 4);
        while (quoteDepth < depth) {
            html += "<blockquote>";
            quoteDepth += 1;
        }
        while (quoteDepth > depth) {
            html += "</blockquote>";
            quoteDepth -= 1;
        }
        const content = escapeHtml(match?.[2] ?? line);
        html += `<p>${content || "<br>"}</p>`;
    }
    while (quoteDepth > 0) {
        html += "</blockquote>";
        quoteDepth -= 1;
    }
    return html;
}
function normalizeEditorHtml(html) {
    return html.trim() || EMPTY_EDITOR_HTML;
}
const BRAND_FROM = {
    menuary: "hello@menuary.it",
    bizery: "hello@bizery.it",
    orpheo: "hello@weuseorpheo.com",
    pynkstudio: "hello@pynkstudio.it",
};
const BRAND_LABELS = {
    menuary: "Menuary",
    bizery: "Bizery",
    orpheo: "Orpheo",
    pynkstudio: "PynkStudio",
};
const BRAND_ORDER = ["pynkstudio", "menuary", "bizery", "orpheo"];
const BRAND_PILL_ACTIVE = {
    menuary: "bg-[#a95f45] text-white shadow-sm",
    bizery: "bg-[#3b6cb5] text-white shadow-sm",
    orpheo: "bg-[#7c3aed] text-white shadow-sm",
    pynkstudio: "bg-[#d946a8] text-white shadow-sm",
};
const DEFAULT_LOCAL_PARTS = ["hello", "amministrazione", "pagamenti", "support"];
function splitEmailAddress(address) {
    const clean = address?.trim().toLowerCase();
    if (!clean)
        return null;
    const match = clean.match(/^([^@\s]+)@([^@\s]+\.[^@\s]+)$/);
    return match ? { localPart: match[1], domain: match[2] } : null;
}
function normalizeLocalPart(value) {
    return value.trim().toLowerCase().replace(/^@+/, "");
}
function isValidLocalPart(value) {
    return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(value) && !value.includes("..");
}
function uniqueLocalParts(values) {
    const seen = new Set();
    return values
        .map(normalizeLocalPart)
        .filter((value) => value && isValidLocalPart(value))
        .filter((value) => {
        if (seen.has(value))
            return false;
        seen.add(value);
        return true;
    });
}
function savedLocalPartsKey(domain) {
    return `mailapp:from-local-parts:${domain}`;
}
function readSavedLocalParts(domain) {
    if (typeof window === "undefined")
        return [];
    try {
        const raw = window.localStorage.getItem(savedLocalPartsKey(domain));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? uniqueLocalParts(parsed.filter((v) => typeof v === "string")) : [];
    }
    catch {
        return [];
    }
}
function writeSavedLocalParts(domain, values) {
    if (typeof window === "undefined")
        return;
    window.localStorage.setItem(savedLocalPartsKey(domain), JSON.stringify(uniqueLocalParts(values)));
}
export function ComposeDrawer({ open, canCompose, onClose, onSent, defaultBrand = "menuary", tenantId, fromAddress, fromName, currentUserEmail, lockBrand = false, preferredFromAddress, initialTo, initialSubject, initialBody, initialAttachments, }) {
    const [brand, setBrand] = useState(defaultBrand);
    const [to, setTo] = useState(initialTo ?? "");
    const [subject, setSubject] = useState(initialSubject ?? "");
    const [localPart, setLocalPart] = useState("");
    const [customLocalPart, setCustomLocalPart] = useState("");
    const [saveCustomLocalPart, setSaveCustomLocalPart] = useState(false);
    const [savedLocalParts, setSavedLocalParts] = useState([]);
    // L'editor del corpo è uncontrolled: il contenuto vive nel DOM e in bodyHtmlRef,
    // mai in uno state che React possa riapplicare al contenteditable durante un
    // re-render (es. il polling inbox) cancellando quanto digitato.
    const bodyHtmlRef = useRef(plainTextToHtml(initialBody ?? ""));
    const [attachments, setAttachments] = useState(initialAttachments ?? []);
    const fileInputRef = useRef(null);
    const editorRef = useRef(null);
    const [signature, setSignature] = useState("");
    const [signatureFromName, setSignatureFromName] = useState("");
    const [error, setError] = useState(null);
    const [isPending, start] = useTransition();
    const toRef = useRef(null);
    const previousDomainRef = useRef(null);
    const domain = useMemo(() => {
        const locked = splitEmailAddress(fromAddress);
        const branded = splitEmailAddress(BRAND_FROM[brand]);
        return locked?.domain ?? branded?.domain ?? "";
    }, [brand, fromAddress]);
    const userLocalPart = useMemo(() => {
        const parsed = splitEmailAddress(currentUserEmail);
        return parsed && parsed.domain === domain ? parsed.localPart : null;
    }, [currentUserEmail, domain]);
    const preferredLocalPart = useMemo(() => {
        const parsed = splitEmailAddress(preferredFromAddress);
        return parsed && parsed.domain === domain ? parsed.localPart : null;
    }, [preferredFromAddress, domain]);
    const baseLocalPart = useMemo(() => {
        if (preferredLocalPart)
            return preferredLocalPart;
        if (userLocalPart)
            return userLocalPart;
        const locked = splitEmailAddress(fromAddress);
        if (locked?.domain === domain)
            return locked.localPart;
        return "hello";
    }, [domain, fromAddress, preferredLocalPart, userLocalPart]);
    const localPartOptions = useMemo(() => uniqueLocalParts([
        baseLocalPart,
        ...(userLocalPart ? [userLocalPart] : []),
        ...(preferredLocalPart ? [preferredLocalPart] : []),
        ...DEFAULT_LOCAL_PARTS,
        ...savedLocalParts,
    ]), [baseLocalPart, preferredLocalPart, savedLocalParts, userLocalPart]);
    const effectiveLocalPart = localPart === "__custom__" ? normalizeLocalPart(customLocalPart) : localPart;
    const effectiveFromAddress = domain && effectiveLocalPart ? `${effectiveLocalPart}@${domain}` : fromAddress ?? BRAND_FROM[brand];
    const isDirty = useMemo(() => open && (to.trim() !== "" || subject.trim() !== ""), [open, to, subject]);
    useUnsavedChangesWarning(isDirty);
    // Autosave bozza solo per composizione fresh (non reply/forward con prefill)
    const isFreshCompose = !initialTo && !initialSubject && !initialBody;
    const composeDraft = useDraftPersistence("draft:compose");
    const [showDraftBanner, setShowDraftBanner] = useState(false);
    // Watcher su to/subject: salva bozza quando cambiano
    useEffect(() => {
        if (!isFreshCompose || !open)
            return;
        composeDraft.saveDraft({ to, subject, bodyHtml: bodyHtmlRef.current });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [to, subject]);
    // Interval per catturare il corpo contenteditable (non è React state)
    useEffect(() => {
        if (!isFreshCompose || !open)
            return;
        const id = window.setInterval(() => {
            composeDraft.saveDraft({ to, subject, bodyHtml: bodyHtmlRef.current });
        }, 3000);
        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [to, subject, open, isFreshCompose]);
    // Carica firma quando cambia brand
    useEffect(() => {
        if (!open || !canCompose)
            return;
        fetch(`/api/email/signature?brand=${brand}`)
            .then((r) => r.json())
            .then((d) => {
            setSignature(d.signature?.html ?? "");
            setSignatureFromName(d.signature?.fromName ?? "");
        })
            .catch(() => {
            setSignature("");
            setSignatureFromName("");
        });
    }, [brand, open, canCompose]);
    useEffect(() => {
        if (!open || !domain)
            return;
        const saved = readSavedLocalParts(domain);
        setSavedLocalParts(saved);
        const domainChanged = previousDomainRef.current !== domain;
        previousDomainRef.current = domain;
        setLocalPart((current) => {
            if (domainChanged)
                return baseLocalPart;
            if (current && current !== "__custom__")
                return current;
            return baseLocalPart;
        });
    }, [baseLocalPart, domain, open]);
    // All'apertura applica i prefill (To / Oggetto / Brand) e gestisce il focus
    useEffect(() => {
        if (!open)
            return;
        if (isFreshCompose && composeDraft.draftDate) {
            setShowDraftBanner(true);
        }
        else {
            setShowDraftBanner(false);
        }
        if (initialTo !== undefined)
            setTo(initialTo);
        if (initialSubject !== undefined)
            setSubject(initialSubject);
        const nextBodyHtml = plainTextToHtml(initialBody ?? "");
        bodyHtmlRef.current = nextBodyHtml;
        if (editorRef.current)
            editorRef.current.innerHTML = nextBodyHtml;
        if (initialAttachments !== undefined)
            setAttachments(initialAttachments);
        setBrand(defaultBrand);
        setCustomLocalPart("");
        setSaveCustomLocalPart(false);
        setError(null);
        setTimeout(() => {
            if (initialTo) {
                // Se "A:" è già compilato porta il focus all'oggetto
                const el = document.activeElement;
                el?.blur();
            }
            else {
                toRef.current?.focus();
            }
        }, 80);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    function reset() {
        bodyHtmlRef.current = EMPTY_EDITOR_HTML;
        setTo("");
        setSubject("");
        setError(null);
        setAttachments([]);
        setCustomLocalPart("");
        setSaveCustomLocalPart(false);
        if (editorRef.current)
            editorRef.current.innerHTML = EMPTY_EDITOR_HTML;
        composeDraft.clearDraft();
        setShowDraftBanner(false);
    }
    const restoreComposeDraft = useCallback(() => {
        const d = composeDraft.readDraft();
        if (!d)
            return;
        setTo(d.to);
        setSubject(d.subject);
        bodyHtmlRef.current = d.bodyHtml;
        if (editorRef.current)
            editorRef.current.innerHTML = d.bodyHtml;
        composeDraft.clearDraft();
        setShowDraftBanner(false);
    }, [composeDraft]);
    async function handleFiles(files) {
        if (!files || !files.length)
            return;
        setError(null);
        const next = [...attachments];
        for (const file of Array.from(files)) {
            if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
                setError(`L'allegato "${file.name}" supera ${MAX_ATTACHMENT_MB} MB.`);
                continue;
            }
            const att = await fileToAttachment(file);
            next.push(att);
        }
        const total = next.reduce((s, a) => s + a.size, 0);
        if (total > MAX_TOTAL_MB * 1024 * 1024) {
            setError(`Dimensione totale degli allegati superiore a ${MAX_TOTAL_MB} MB.`);
            return;
        }
        setAttachments(next);
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    }
    function removeAttachment(i) {
        setAttachments((list) => list.filter((_, idx) => idx !== i));
    }
    function handleClose() {
        reset();
        onClose();
    }
    function syncEditor() {
        bodyHtmlRef.current = normalizeEditorHtml(editorRef.current?.innerHTML ?? "");
    }
    function runCommand(command, value) {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        syncEditor();
    }
    function insertLink() {
        const raw = window.prompt("URL del link");
        if (!raw)
            return;
        const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        runCommand("createLink", href);
    }
    function buildHtml() {
        const currentBody = normalizeEditorHtml(editorRef.current?.innerHTML ?? bodyHtmlRef.current);
        const sigBlock = signature ? `<br><br>${signature}` : "";
        return `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#111;line-height:1.7">${currentBody}</div>${sigBlock}`;
    }
    function handleSend() {
        setError(null);
        const toList = to.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        if (!toList.length) {
            setError("Inserisci almeno un destinatario.");
            return;
        }
        if (!subject.trim()) {
            setError("L'oggetto è obbligatorio.");
            return;
        }
        const editorText = editorRef.current?.textContent?.trim() ?? "";
        if (!editorText) {
            setError("Scrivi il corpo del messaggio.");
            return;
        }
        if (!effectiveLocalPart || !isValidLocalPart(effectiveLocalPart)) {
            setError("Inserisci una local-part valida per il mittente.");
            return;
        }
        const effectiveFromName = fromName || signatureFromName || BRAND_LABELS[brand];
        const fromOverride = `${effectiveFromName} <${effectiveFromAddress}>`;
        const replyTo = effectiveFromAddress;
        start(async () => {
            try {
                const res = await fetch("/api/email/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toList,
                        subject: subject.trim(),
                        html: buildHtml(),
                        fromOverride,
                        replyTo,
                        tenantId,
                        ...(attachments.length
                            ? {
                                attachments: attachments.map((a) => ({
                                    filename: a.filename,
                                    content: a.content,
                                    contentType: a.contentType,
                                })),
                            }
                            : {}),
                    }),
                });
                const data = (await res.json());
                if (!res.ok || !data.ok) {
                    setError(data.error ?? "Errore invio.");
                    return;
                }
                if (localPart === "__custom__" && saveCustomLocalPart && domain) {
                    const nextSaved = uniqueLocalParts([...savedLocalParts, effectiveLocalPart]);
                    writeSavedLocalParts(domain, nextSaved);
                    setSavedLocalParts(nextSaved);
                }
                reset();
                onSent();
                onClose();
            }
            catch {
                setError("Errore di rete.");
            }
        });
    }
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center", children: [_jsx("div", { className: "absolute inset-0 bg-black/30 backdrop-blur-sm", onClick: handleClose }), _jsxs("div", { className: "relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-[var(--ma-line)] px-5 py-4", children: [_jsx("h2", { className: "font-semibold text-[var(--ma-ink)]", children: "Nuovo messaggio" }), _jsx("button", { onClick: handleClose, className: "menuary-admin-nav-link !w-auto !px-2 !py-1.5", "aria-label": "Chiudi", children: _jsx(X, { size: 16 }) })] }), showDraftBanner && (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5", children: [_jsxs("span", { className: "text-xs font-semibold text-amber-800", children: ["Hai una bozza del", " ", composeDraft.draftDate?.toLocaleDateString("it-IT", {
                                        day: "2-digit", month: "short", year: "numeric",
                                        hour: "2-digit", minute: "2-digit",
                                    })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => { composeDraft.clearDraft(); setShowDraftBanner(false); }, className: "text-xs font-bold text-amber-700 hover:underline", children: "Ignora" }), _jsx("button", { type: "button", onClick: restoreComposeDraft, className: "rounded-full bg-amber-700 px-3 py-1 text-xs font-bold text-white hover:opacity-90", children: "Recupera" })] })] })), _jsxs("div", { className: "divide-y divide-[var(--ma-line)]", children: [_jsxs("div", { className: "flex items-center gap-3 px-5 py-3", children: [_jsx("span", { className: "w-14 shrink-0 text-sm text-[var(--ma-muted)]", children: "Da" }), _jsxs("div", { className: "min-w-0 flex-1 space-y-2", children: [!lockBrand && (_jsx("div", { role: "radiogroup", "aria-label": "Verticale di invio", className: "flex flex-wrap gap-1 rounded-lg bg-[var(--ma-surface)] p-1", children: BRAND_ORDER.map((b) => {
                                                    const active = brand === b;
                                                    const brandDomain = splitEmailAddress(BRAND_FROM[b])?.domain ?? "";
                                                    return (_jsxs("button", { type: "button", role: "radio", "aria-checked": active, onClick: () => setBrand(b), className: cn("rounded-md px-3 py-1.5 text-xs font-semibold transition-colors", active
                                                            ? BRAND_PILL_ACTIVE[b]
                                                            : "text-[var(--ma-muted)] hover:text-[var(--ma-ink)]"), children: [BRAND_LABELS[b], " ", _jsxs("span", { className: cn("font-normal", active ? "opacity-80" : "opacity-60"), children: ["@", brandDomain] })] }, b));
                                                }) })), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [localPartOptions.map((option) => {
                                                        const active = localPart === option;
                                                        const removable = savedLocalParts.includes(option) && !DEFAULT_LOCAL_PARTS.includes(option);
                                                        return (_jsxs("span", { className: cn("inline-flex items-center overflow-hidden rounded-full border text-xs font-semibold", active
                                                                ? "border-[var(--ma-accent)] bg-[var(--ma-accent)] text-white"
                                                                : "border-[var(--ma-line)] bg-white text-[var(--ma-ink)]"), children: [_jsx("button", { type: "button", onClick: () => setLocalPart(option), className: "px-2.5 py-1", children: option }), removable && (_jsx("button", { type: "button", onClick: () => {
                                                                        const nextSaved = savedLocalParts.filter((value) => value !== option);
                                                                        writeSavedLocalParts(domain, nextSaved);
                                                                        setSavedLocalParts(nextSaved);
                                                                        if (localPart === option)
                                                                            setLocalPart(baseLocalPart);
                                                                    }, className: cn("border-l px-1.5 py-1", active ? "border-white/30 hover:bg-white/15" : "border-[var(--ma-line)] text-[var(--ma-muted)] hover:text-red-600"), "aria-label": `Rimuovi ${option}`, children: _jsx(X, { size: 11 }) }))] }, option));
                                                    }), _jsx("button", { type: "button", onClick: () => setLocalPart("__custom__"), className: cn("rounded-full border px-2.5 py-1 text-xs font-semibold", localPart === "__custom__"
                                                            ? "border-[var(--ma-accent)] bg-[var(--ma-accent)] text-white"
                                                            : "border-[var(--ma-line)] bg-white text-[var(--ma-ink)]"), children: "Personalizzata" })] }), localPart === "__custom__" && (_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "flex min-w-[260px] flex-1 items-center rounded-lg border border-[var(--ma-line)] bg-white px-3 py-1.5 text-sm", children: [_jsx("input", { value: customLocalPart, onChange: (e) => setCustomLocalPart(e.target.value), placeholder: "nome-casella", className: "min-w-0 flex-1 bg-transparent text-[var(--ma-ink)] placeholder:text-[var(--ma-muted)] focus:outline-none" }), _jsxs("span", { className: "shrink-0 text-[var(--ma-muted)]", children: ["@", domain] })] }), _jsxs("label", { className: "inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ma-muted)]", children: [_jsx("input", { type: "checkbox", checked: saveCustomLocalPart, onChange: (e) => setSaveCustomLocalPart(e.target.checked), className: "h-3.5 w-3.5 accent-[var(--ma-accent)]" }), "Salva"] })] })), _jsxs("p", { className: "text-[11px] font-medium text-[var(--ma-muted)]", children: ["Mittente: ", _jsx("span", { className: "text-[var(--ma-ink)]", children: effectiveFromAddress })] })] })] }), _jsxs("div", { className: "flex items-center px-5 py-2.5", children: [_jsx("span", { className: "w-14 shrink-0 text-sm text-[var(--ma-muted)]", children: "A" }), _jsx("input", { ref: toRef, value: to, onChange: (e) => setTo(e.target.value), placeholder: "destinatario@email.it, altro@email.it", className: "flex-1 bg-transparent text-sm text-[var(--ma-ink)] placeholder:text-[var(--ma-muted)] focus:outline-none" })] }), _jsxs("div", { className: "flex items-center px-5 py-2.5", children: [_jsx("span", { className: "w-14 shrink-0 text-sm text-[var(--ma-muted)]", children: "Oggetto" }), _jsx("input", { value: subject, onChange: (e) => setSubject(e.target.value), placeholder: "Oggetto del messaggio", className: "flex-1 bg-transparent text-sm text-[var(--ma-ink)] placeholder:text-[var(--ma-muted)] focus:outline-none" })] })] }), _jsx("div", { className: "border-b border-[var(--ma-line)] px-4 py-2", children: _jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [_jsx("button", { type: "button", onClick: () => runCommand("bold"), className: "menuary-admin-nav-link !w-auto !p-1.5", title: "Grassetto", children: _jsx(Bold, { size: 14 }) }), _jsx("button", { type: "button", onClick: () => runCommand("italic"), className: "menuary-admin-nav-link !w-auto !p-1.5", title: "Corsivo", children: _jsx(Italic, { size: 14 }) }), _jsx("button", { type: "button", onClick: () => runCommand("underline"), className: "menuary-admin-nav-link !w-auto !p-1.5", title: "Sottolineato", children: _jsx(Underline, { size: 14 }) }), _jsx("span", { className: "mx-1 h-5 w-px bg-[var(--ma-line)]" }), _jsx("button", { type: "button", onClick: () => runCommand("insertUnorderedList"), className: "menuary-admin-nav-link !w-auto !p-1.5", title: "Elenco puntato", children: _jsx(List, { size: 14 }) }), _jsx("button", { type: "button", onClick: () => runCommand("insertOrderedList"), className: "menuary-admin-nav-link !w-auto !p-1.5", title: "Elenco numerato", children: _jsx(ListOrdered, { size: 14 }) }), _jsx("button", { type: "button", onClick: () => runCommand("formatBlock", "blockquote"), className: "menuary-admin-nav-link !w-auto !p-1.5", title: "Citazione", children: _jsx(Quote, { size: 14 }) }), _jsx("button", { type: "button", onClick: () => runCommand("indent"), className: "menuary-admin-nav-link !w-auto !p-1.5", title: "Aumenta livello citazione", children: _jsx(IndentIncrease, { size: 14 }) }), _jsx("button", { type: "button", onClick: () => runCommand("outdent"), className: "menuary-admin-nav-link !w-auto !p-1.5", title: "Riduci livello citazione", children: _jsx(IndentDecrease, { size: 14 }) }), _jsx("span", { className: "mx-1 h-5 w-px bg-[var(--ma-line)]" }), _jsx("button", { type: "button", onClick: insertLink, className: "menuary-admin-nav-link !w-auto !p-1.5", title: "Inserisci link", children: _jsx(Link2, { size: 14 }) })] }) }), _jsx("div", { ref: editorRef, contentEditable: true, suppressContentEditableWarning: true, onInput: syncEditor, className: "compose-rich-editor min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm text-[var(--ma-ink)] focus:outline-none", "data-placeholder": "Scrivi il tuo messaggio..." }), attachments.length > 0 && (_jsxs("div", { className: "border-t border-[var(--ma-line)] px-5 py-3", children: [_jsxs("p", { className: "mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ma-muted)]", children: ["Allegati (", attachments.length, ")"] }), _jsx("ul", { className: "flex flex-wrap gap-2", children: attachments.map((a, i) => (_jsxs("li", { className: "inline-flex items-center gap-2 rounded-md border border-[var(--ma-line)] bg-[var(--ma-surface)] px-2 py-1 text-xs text-[var(--ma-ink)]", children: [_jsx(Paperclip, { size: 12 }), _jsx("span", { className: "max-w-[200px] truncate", title: a.filename, children: a.filename }), _jsx("span", { className: "text-[var(--ma-muted)]", children: fmtSize(a.size) }), _jsx("button", { type: "button", onClick: () => removeAttachment(i), className: "text-[var(--ma-muted)] hover:text-red-600", "aria-label": `Rimuovi ${a.filename}`, children: _jsx(Trash2, { size: 12 }) })] }, `${a.filename}-${i}`))) })] })), signature && (_jsxs("div", { className: "border-t border-[var(--ma-line)] px-5 py-3", children: [_jsx("p", { className: "mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ma-muted)]", children: "Firma automatica" }), _jsx("div", { className: "text-sm", dangerouslySetInnerHTML: { __html: signature } })] })), _jsxs("div", { className: cn("flex items-center justify-between border-t border-[var(--ma-line)] px-5 py-3", error && "flex-col gap-2 items-start"), children: [error && _jsx("p", { className: "text-xs text-red-600", children: error }), _jsxs("div", { className: "flex w-full items-center justify-between gap-2", children: [_jsx("input", { ref: fileInputRef, type: "file", multiple: true, className: "hidden", onChange: (e) => handleFiles(e.target.files) }), _jsxs("button", { type: "button", onClick: () => fileInputRef.current?.click(), className: "inline-flex items-center gap-1.5 rounded-md border border-[var(--ma-line)] px-3 py-1.5 text-xs font-medium text-[var(--ma-ink)] hover:bg-[var(--ma-surface)]", children: [_jsx(Paperclip, { size: 13 }), " Allega file"] }), _jsxs("button", { onClick: handleSend, disabled: isPending || !canCompose, className: "menuary-admin-action-btn flex items-center gap-2 disabled:opacity-50", children: [_jsx(Send, { size: 15 }), isPending ? "Invio…" : "Invia"] })] })] })] })] }));
}
//# sourceMappingURL=compose-drawer.js.map