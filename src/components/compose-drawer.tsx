"use client";

import { useState, useEffect, useMemo, useTransition, useRef, useCallback } from "react";
import { useDraftPersistence } from "../hooks/use-draft-persistence";
import { useUnsavedChangesWarning } from "../hooks/use-unsaved-changes-warning";
import { Bold, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered, Paperclip, Quote, Send, Trash2, Underline, X } from "lucide-react";
import { cn } from "../utils";
import type { InboundEmailBrand } from "../email/inbound-types";

export type ComposeAttachment = {
  filename: string;
  /** Base64 senza prefisso `data:` */
  content: string;
  contentType?: string;
  /** Dimensione in byte, calcolata dal base64. */
  size: number;
};

const MAX_ATTACHMENT_MB = 8;
const MAX_TOTAL_MB = 20;
const EMPTY_EDITOR_HTML = "<p><br></p>";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function fileToAttachment(file: File): Promise<ComposeAttachment> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const content = btoa(binary);
  return {
    filename: file.name,
    content,
    contentType: file.type || undefined,
    size: file.size,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainTextToHtml(text: string): string {
  if (!text.trim()) return EMPTY_EDITOR_HTML;

  const lines = text.split(/\r?\n/);
  let html = "";
  let quoteDepth = 0;

  for (const line of lines) {
    const match = line.match(/^(>+)\s?(.*)$/);
    const depth = Math.min(match?.[1].length ?? 0, 4);
    while (quoteDepth < depth) { html += "<blockquote>"; quoteDepth += 1; }
    while (quoteDepth > depth) { html += "</blockquote>"; quoteDepth -= 1; }
    const content = escapeHtml(match?.[2] ?? line);
    html += `<p>${content || "<br>"}</p>`;
  }

  while (quoteDepth > 0) { html += "</blockquote>"; quoteDepth -= 1; }
  return html;
}

function normalizeEditorHtml(html: string): string {
  return html.trim() || EMPTY_EDITOR_HTML;
}

type Props = {
  open: boolean;
  canCompose: boolean;
  onClose: () => void;
  onSent: () => void;
  defaultBrand?: InboundEmailBrand;
  tenantId?: string;
  fromAddress?: string;
  fromName?: string;
  currentUserEmail?: string | null;
  lockBrand?: boolean;
  preferredFromAddress?: string;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  initialAttachments?: ComposeAttachment[];
};

const BRAND_FROM: Record<InboundEmailBrand, string> = {
  menuary:    "hello@menuary.it",
  bizery:     "hello@bizery.it",
  orpheo:     "hello@weuseorpheo.com",
  pynkstudio: "hello@pynkstudio.it",
};

const BRAND_LABELS: Record<InboundEmailBrand, string> = {
  menuary:    "Menuary",
  bizery:     "Bizery",
  orpheo:     "Orpheo",
  pynkstudio: "PynkStudio",
};

const BRAND_ORDER: InboundEmailBrand[] = ["pynkstudio", "menuary", "bizery", "orpheo"];

const BRAND_PILL_ACTIVE: Record<InboundEmailBrand, string> = {
  menuary:    "bg-[#a95f45] text-white shadow-sm",
  bizery:     "bg-[#3b6cb5] text-white shadow-sm",
  orpheo:     "bg-[#7c3aed] text-white shadow-sm",
  pynkstudio: "bg-[#d946a8] text-white shadow-sm",
};

const DEFAULT_LOCAL_PARTS = ["hello", "amministrazione", "pagamenti", "support"];

function splitEmailAddress(address?: string | null): { localPart: string; domain: string } | null {
  const clean = address?.trim().toLowerCase();
  if (!clean) return null;
  const match = clean.match(/^([^@\s]+)@([^@\s]+\.[^@\s]+)$/);
  return match ? { localPart: match[1], domain: match[2] } : null;
}

function normalizeLocalPart(value: string): string {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

function isValidLocalPart(value: string): boolean {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(value) && !value.includes("..");
}

function uniqueLocalParts(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map(normalizeLocalPart)
    .filter((value) => value && isValidLocalPart(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function savedLocalPartsKey(domain: string): string {
  return `mailapp:from-local-parts:${domain}`;
}

function readSavedLocalParts(domain: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(savedLocalPartsKey(domain));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? uniqueLocalParts(parsed.filter((v) => typeof v === "string")) : [];
  } catch {
    return [];
  }
}

function writeSavedLocalParts(domain: string, values: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(savedLocalPartsKey(domain), JSON.stringify(uniqueLocalParts(values)));
}

export function ComposeDrawer({
  open,
  canCompose,
  onClose,
  onSent,
  defaultBrand = "menuary",
  tenantId,
  fromAddress,
  fromName,
  currentUserEmail,
  lockBrand = false,
  preferredFromAddress,
  initialTo,
  initialSubject,
  initialBody,
  initialAttachments,
}: Props) {
  const [brand, setBrand]       = useState<InboundEmailBrand>(defaultBrand);
  const [to, setTo]             = useState(initialTo ?? "");
  const [subject, setSubject]   = useState(initialSubject ?? "");
  const [localPart, setLocalPart] = useState("");
  const [customLocalPart, setCustomLocalPart] = useState("");
  const [saveCustomLocalPart, setSaveCustomLocalPart] = useState(false);
  const [savedLocalParts, setSavedLocalParts] = useState<string[]>([]);
  // L'editor del corpo è uncontrolled: il contenuto vive nel DOM e in bodyHtmlRef,
  // mai in uno state che React possa riapplicare al contenteditable durante un
  // re-render (es. il polling inbox) cancellando quanto digitato.
  const bodyHtmlRef = useRef(plainTextToHtml(initialBody ?? ""));
  const [attachments, setAttachments] = useState<ComposeAttachment[]>(initialAttachments ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [signature, setSignature] = useState("");
  const [signatureFromName, setSignatureFromName] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [isPending, start]      = useTransition();
  const toRef = useRef<HTMLInputElement>(null);
  const previousDomainRef = useRef<string | null>(null);
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
    if (preferredLocalPart) return preferredLocalPart;
    if (userLocalPart) return userLocalPart;
    const locked = splitEmailAddress(fromAddress);
    if (locked?.domain === domain) return locked.localPart;
    return "hello";
  }, [domain, fromAddress, preferredLocalPart, userLocalPart]);
  const localPartOptions = useMemo(
    () => uniqueLocalParts([
      baseLocalPart,
      ...(userLocalPart ? [userLocalPart] : []),
      ...(preferredLocalPart ? [preferredLocalPart] : []),
      ...DEFAULT_LOCAL_PARTS,
      ...savedLocalParts,
    ]),
    [baseLocalPart, preferredLocalPart, savedLocalParts, userLocalPart],
  );
  const effectiveLocalPart = localPart === "__custom__" ? normalizeLocalPart(customLocalPart) : localPart;
  const effectiveFromAddress = domain && effectiveLocalPart ? `${effectiveLocalPart}@${domain}` : fromAddress ?? BRAND_FROM[brand];

  const isDirty = useMemo(() => open && (to.trim() !== "" || subject.trim() !== ""), [open, to, subject]);
  useUnsavedChangesWarning(isDirty);

  // Autosave bozza solo per composizione fresh (non reply/forward con prefill)
  const isFreshCompose = !initialTo && !initialSubject && !initialBody;
  const composeDraft = useDraftPersistence<{ to: string; subject: string; bodyHtml: string }>(
    "draft:compose",
  );
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Watcher su to/subject: salva bozza quando cambiano
  useEffect(() => {
    if (!isFreshCompose || !open) return;
    composeDraft.saveDraft({ to, subject, bodyHtml: bodyHtmlRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, subject]);

  // Interval per catturare il corpo contenteditable (non è React state)
  useEffect(() => {
    if (!isFreshCompose || !open) return;
    const id = window.setInterval(() => {
      composeDraft.saveDraft({ to, subject, bodyHtml: bodyHtmlRef.current });
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, subject, open, isFreshCompose]);

  // Carica firma quando cambia brand
  useEffect(() => {
    if (!open || !canCompose) return;
    fetch(`/api/email/signature?brand=${brand}`)
      .then((r) => r.json())
      .then((d: { signature?: { html?: string; fromName?: string } }) => {
        setSignature(d.signature?.html ?? "");
        setSignatureFromName(d.signature?.fromName ?? "");
      })
      .catch(() => {
        setSignature("");
        setSignatureFromName("");
      });
  }, [brand, open, canCompose]);

  useEffect(() => {
    if (!open || !domain) return;
    const saved = readSavedLocalParts(domain);
    setSavedLocalParts(saved);
    const domainChanged = previousDomainRef.current !== domain;
    previousDomainRef.current = domain;
    setLocalPart((current) => {
      if (domainChanged) return baseLocalPart;
      if (current && current !== "__custom__") return current;
      return baseLocalPart;
    });
  }, [baseLocalPart, domain, open]);

  // All'apertura applica i prefill (To / Oggetto / Brand) e gestisce il focus
  useEffect(() => {
    if (!open) return;
    if (isFreshCompose && composeDraft.draftDate) {
      setShowDraftBanner(true);
    } else {
      setShowDraftBanner(false);
    }
    if (initialTo !== undefined) setTo(initialTo);
    if (initialSubject !== undefined) setSubject(initialSubject);
    const nextBodyHtml = plainTextToHtml(initialBody ?? "");
    bodyHtmlRef.current = nextBodyHtml;
    if (editorRef.current) editorRef.current.innerHTML = nextBodyHtml;
    if (initialAttachments !== undefined) setAttachments(initialAttachments);
    setBrand(defaultBrand);
    setCustomLocalPart("");
    setSaveCustomLocalPart(false);
    setError(null);
    setTimeout(() => {
      if (initialTo) {
        // Se "A:" è già compilato porta il focus all'oggetto
        const el = document.activeElement as HTMLElement | null;
        el?.blur();
      } else {
        toRef.current?.focus();
      }
    }, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    bodyHtmlRef.current = EMPTY_EDITOR_HTML;
    setTo(""); setSubject(""); setError(null); setAttachments([]);
    setCustomLocalPart("");
    setSaveCustomLocalPart(false);
    if (editorRef.current) editorRef.current.innerHTML = EMPTY_EDITOR_HTML;
    composeDraft.clearDraft();
    setShowDraftBanner(false);
  }

  const restoreComposeDraft = useCallback(() => {
    const d = composeDraft.readDraft();
    if (!d) return;
    setTo(d.to);
    setSubject(d.subject);
    bodyHtmlRef.current = d.bodyHtml;
    if (editorRef.current) editorRef.current.innerHTML = d.bodyHtml;
    composeDraft.clearDraft();
    setShowDraftBanner(false);
  }, [composeDraft]);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setError(null);
    const next: ComposeAttachment[] = [...attachments];
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(i: number) {
    setAttachments((list) => list.filter((_, idx) => idx !== i));
  }

  function handleClose() {
    reset();
    onClose();
  }

  function syncEditor() {
    bodyHtmlRef.current = normalizeEditorHtml(editorRef.current?.innerHTML ?? "");
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditor();
  }

  function insertLink() {
    const raw = window.prompt("URL del link");
    if (!raw) return;
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    runCommand("createLink", href);
  }

  function buildHtml(): string {
    const currentBody = normalizeEditorHtml(editorRef.current?.innerHTML ?? bodyHtmlRef.current);
    const sigBlock = signature ? `<br><br>${signature}` : "";
    return `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#111;line-height:1.7">${currentBody}</div>${sigBlock}`;
  }

  function handleSend() {
    setError(null);
    const toList = to.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (!toList.length) { setError("Inserisci almeno un destinatario."); return; }
    if (!subject.trim()) { setError("L'oggetto è obbligatorio."); return; }
    const editorText = editorRef.current?.textContent?.trim() ?? "";
    if (!editorText) { setError("Scrivi il corpo del messaggio."); return; }
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
        const data = (await res.json()) as { ok?: boolean; error?: string };
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
      } catch {
        setError("Errore di rete.");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Pannello */}
      <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--ma-line)] px-5 py-4">
          <h2 className="font-semibold text-[var(--ma-ink)]">Nuovo messaggio</h2>
          <button onClick={handleClose} className="menuary-admin-nav-link !w-auto !px-2 !py-1.5" aria-label="Chiudi">
            <X size={16} />
          </button>
        </div>

        {/* Banner bozza */}
        {showDraftBanner && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5">
            <span className="text-xs font-semibold text-amber-800">
              Hai una bozza del{" "}
              {composeDraft.draftDate?.toLocaleDateString("it-IT", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => { composeDraft.clearDraft(); setShowDraftBanner(false); }}
                className="text-xs font-bold text-amber-700 hover:underline">
                Ignora
              </button>
              <button type="button" onClick={restoreComposeDraft}
                className="rounded-full bg-amber-700 px-3 py-1 text-xs font-bold text-white hover:opacity-90">
                Recupera
              </button>
            </div>
          </div>
        )}

        {/* Campi */}
        <div className="divide-y divide-[var(--ma-line)]">
          {/* Da: picker brand sempre visibile, preselezionato in base al contesto. */}
          <div className="flex items-center gap-3 px-5 py-3">
            <span className="w-14 shrink-0 text-sm text-[var(--ma-muted)]">Da</span>
            <div className="min-w-0 flex-1 space-y-2">
              {!lockBrand && (
                <div
                  role="radiogroup"
                  aria-label="Verticale di invio"
                  className="flex flex-wrap gap-1 rounded-lg bg-[var(--ma-surface)] p-1"
                >
                  {BRAND_ORDER.map((b) => {
                    const active = brand === b;
                    const brandDomain = splitEmailAddress(BRAND_FROM[b])?.domain ?? "";
                    return (
                      <button
                        key={b}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setBrand(b)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                          active
                            ? BRAND_PILL_ACTIVE[b]
                            : "text-[var(--ma-muted)] hover:text-[var(--ma-ink)]",
                        )}
                      >
                        {BRAND_LABELS[b]}{" "}
                        <span className={cn("font-normal", active ? "opacity-80" : "opacity-60")}>
                          @{brandDomain}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {localPartOptions.map((option) => {
                  const active = localPart === option;
                  const removable = savedLocalParts.includes(option) && !DEFAULT_LOCAL_PARTS.includes(option);
                  return (
                    <span
                      key={option}
                      className={cn(
                        "inline-flex items-center overflow-hidden rounded-full border text-xs font-semibold",
                        active
                          ? "border-[var(--ma-accent)] bg-[var(--ma-accent)] text-white"
                          : "border-[var(--ma-line)] bg-white text-[var(--ma-ink)]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setLocalPart(option)}
                        className="px-2.5 py-1"
                      >
                        {option}
                      </button>
                      {removable && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextSaved = savedLocalParts.filter((value) => value !== option);
                            writeSavedLocalParts(domain, nextSaved);
                            setSavedLocalParts(nextSaved);
                            if (localPart === option) setLocalPart(baseLocalPart);
                          }}
                          className={cn(
                            "border-l px-1.5 py-1",
                            active ? "border-white/30 hover:bg-white/15" : "border-[var(--ma-line)] text-[var(--ma-muted)] hover:text-red-600",
                          )}
                          aria-label={`Rimuovi ${option}`}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setLocalPart("__custom__")}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold",
                    localPart === "__custom__"
                      ? "border-[var(--ma-accent)] bg-[var(--ma-accent)] text-white"
                      : "border-[var(--ma-line)] bg-white text-[var(--ma-ink)]",
                  )}
                >
                  Personalizzata
                </button>
              </div>
              {localPart === "__custom__" && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex min-w-[260px] flex-1 items-center rounded-lg border border-[var(--ma-line)] bg-white px-3 py-1.5 text-sm">
                    <input
                      value={customLocalPart}
                      onChange={(e) => setCustomLocalPart(e.target.value)}
                      placeholder="nome-casella"
                      className="min-w-0 flex-1 bg-transparent text-[var(--ma-ink)] placeholder:text-[var(--ma-muted)] focus:outline-none"
                    />
                    <span className="shrink-0 text-[var(--ma-muted)]">@{domain}</span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ma-muted)]">
                    <input
                      type="checkbox"
                      checked={saveCustomLocalPart}
                      onChange={(e) => setSaveCustomLocalPart(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--ma-accent)]"
                    />
                    Salva
                  </label>
                </div>
              )}
              <p className="text-[11px] font-medium text-[var(--ma-muted)]">
                Mittente: <span className="text-[var(--ma-ink)]">{effectiveFromAddress}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center px-5 py-2.5">
            <span className="w-14 shrink-0 text-sm text-[var(--ma-muted)]">A</span>
            <input
              ref={toRef}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinatario@email.it, altro@email.it"
              className="flex-1 bg-transparent text-sm text-[var(--ma-ink)] placeholder:text-[var(--ma-muted)] focus:outline-none"
            />
          </div>
          <div className="flex items-center px-5 py-2.5">
            <span className="w-14 shrink-0 text-sm text-[var(--ma-muted)]">Oggetto</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Oggetto del messaggio"
              className="flex-1 bg-transparent text-sm text-[var(--ma-ink)] placeholder:text-[var(--ma-muted)] focus:outline-none"
            />
          </div>
        </div>

        {/* Corpo */}
        <div className="border-b border-[var(--ma-line)] px-4 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => runCommand("bold")} className="menuary-admin-nav-link !w-auto !p-1.5" title="Grassetto">
              <Bold size={14} />
            </button>
            <button type="button" onClick={() => runCommand("italic")} className="menuary-admin-nav-link !w-auto !p-1.5" title="Corsivo">
              <Italic size={14} />
            </button>
            <button type="button" onClick={() => runCommand("underline")} className="menuary-admin-nav-link !w-auto !p-1.5" title="Sottolineato">
              <Underline size={14} />
            </button>
            <span className="mx-1 h-5 w-px bg-[var(--ma-line)]" />
            <button type="button" onClick={() => runCommand("insertUnorderedList")} className="menuary-admin-nav-link !w-auto !p-1.5" title="Elenco puntato">
              <List size={14} />
            </button>
            <button type="button" onClick={() => runCommand("insertOrderedList")} className="menuary-admin-nav-link !w-auto !p-1.5" title="Elenco numerato">
              <ListOrdered size={14} />
            </button>
            <button type="button" onClick={() => runCommand("formatBlock", "blockquote")} className="menuary-admin-nav-link !w-auto !p-1.5" title="Citazione">
              <Quote size={14} />
            </button>
            <button type="button" onClick={() => runCommand("indent")} className="menuary-admin-nav-link !w-auto !p-1.5" title="Aumenta livello citazione">
              <IndentIncrease size={14} />
            </button>
            <button type="button" onClick={() => runCommand("outdent")} className="menuary-admin-nav-link !w-auto !p-1.5" title="Riduci livello citazione">
              <IndentDecrease size={14} />
            </button>
            <span className="mx-1 h-5 w-px bg-[var(--ma-line)]" />
            <button type="button" onClick={insertLink} className="menuary-admin-nav-link !w-auto !p-1.5" title="Inserisci link">
              <Link2 size={14} />
            </button>
          </div>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncEditor}
          className="compose-rich-editor min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm text-[var(--ma-ink)] focus:outline-none"
          data-placeholder="Scrivi il tuo messaggio..."
        />

        {/* Allegati */}
        {attachments.length > 0 && (
          <div className="border-t border-[var(--ma-line)] px-5 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ma-muted)]">
              Allegati ({attachments.length})
            </p>
            <ul className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <li
                  key={`${a.filename}-${i}`}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--ma-line)] bg-[var(--ma-surface)] px-2 py-1 text-xs text-[var(--ma-ink)]"
                >
                  <Paperclip size={12} />
                  <span className="max-w-[200px] truncate" title={a.filename}>{a.filename}</span>
                  <span className="text-[var(--ma-muted)]">{fmtSize(a.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="text-[var(--ma-muted)] hover:text-red-600"
                    aria-label={`Rimuovi ${a.filename}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Anteprima firma automatica (sola lettura) */}
        {signature && (
          <div className="border-t border-[var(--ma-line)] px-5 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ma-muted)]">
              Firma automatica
            </p>
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: signature }}
            />
          </div>
        )}

        {/* Footer */}
        <div className={cn("flex items-center justify-between border-t border-[var(--ma-line)] px-5 py-3", error && "flex-col gap-2 items-start")}>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex w-full items-center justify-between gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ma-line)] px-3 py-1.5 text-xs font-medium text-[var(--ma-ink)] hover:bg-[var(--ma-surface)]"
            >
              <Paperclip size={13} /> Allega file
            </button>
            <button
              onClick={handleSend}
              disabled={isPending || !canCompose}
              className="menuary-admin-action-btn flex items-center gap-2 disabled:opacity-50"
            >
              <Send size={15} />
              {isPending ? "Invio…" : "Invia"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
