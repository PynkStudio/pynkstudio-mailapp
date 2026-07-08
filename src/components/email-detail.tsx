"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Archive, ArrowLeft, Download, ExternalLink, File, FileText, ImageIcon, Link2, Paperclip, Reply, Search, ShieldAlert, ShieldCheck, Star, Trash2, UserCheck, X } from "lucide-react";
import { cn } from "../utils";
import { markEmailRead, starEmail, archiveEmail, deleteEmail, assignEmail, markEmailSpam } from "../email/inbound-queries";
import { findLeadsByEmails, searchLeads, linkInboundEmailToLead, getLeadsByIds } from "../email/lead-link-queries";
import { getSiteadminForAssignment, type SiteadminAssignee } from "../email/assignment-queries";
import { buildEmailSrcDoc } from "../email/render-html";
import type { InboundEmail } from "../email/inbound-types";
import type { ResendInboundAttachment } from "../email/inbound-types";
import type { LeadMatch } from "../email/lead-link-queries";
import type { TenantEmailScope } from "../email/tenant-email-scope";

type Props = {
  email: InboundEmail;
  threadEmails?: InboundEmail[];
  onClose: () => void;
  onMutated: () => void;
  onReply?: (email: InboundEmail) => void;
  onAssigned?: (emailId: string, siteadminId: string | null) => void;
  mode?: "platform" | "tenant";
  scope?: TenantEmailScope;
};

const BRAND_COMPANY_DOMAINS: Record<InboundEmail["brand"], string> = {
  menuary: "menuary.it",
  bizery: "bizery.it",
  orpheo: "weuseorpheo.com",
  pynkstudio: "pynkstudio.it",
};

function formatAssigneeName(a: Pick<SiteadminAssignee, "first_name" | "last_name" | "display_name" | "email">): string {
  const full = [a.first_name, a.last_name].filter(Boolean).join(" ").trim();
  return full || a.display_name?.trim() || a.email;
}

function localPartFromName(a: string | null, b: string | null): string | null {
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

function companyEmailForAssignee(
  assignee: Pick<SiteadminAssignee, "first_name" | "last_name" | "display_name" | "email">,
  brand: InboundEmail["brand"],
): string {
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtSize(size?: number) {
  if (!size) return null;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const BRAND_BADGE: Record<string, string> = {
  menuary: "bg-[#a95f45]/12 text-[#743d2f]",
  bizery:  "bg-[#3b6cb5]/12 text-[#234a85]",
  orpheo:  "bg-[#7c3aed]/12 text-[#4c1d95]",
};

const VERTICAL_LABELS: Record<string, string> = {
  food: "Menuary",
  services: "Bizery",
  creative: "Orpheo",
};

/** Converte URL in testo plain in link cliccabili. */
function linkifyText(text: string): React.ReactNode[] {
  const urlRe = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRe);
  return parts.map((part, i) =>
    urlRe.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--ma-accent)] underline underline-offset-2 break-all"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

function PlainTextEmail({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm leading-relaxed text-[var(--ma-ink)]">
      {text.split(/\r?\n/).map((line, i) => {
        const match = line.match(/^(>+)\s?(.*)$/);
        const depth = Math.min(match?.[1].length ?? 0, 4);
        return (
          <div
            key={i}
            className={cn(
              "min-h-[1em] whitespace-pre-wrap",
              depth > 0 && "border-l-2 border-[var(--ma-line)] pl-3 text-[var(--ma-muted)]",
            )}
            style={depth > 0 ? { marginLeft: `${(depth - 1) * 14}px` } : undefined}
          >
            {linkifyText(match?.[2] ?? line)}
          </div>
        );
      })}
    </div>
  );
}

function base64ToBlob(content: string, contentType: string): Blob {
  const binary = window.atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

function attachmentSrc(att: ResendInboundAttachment): string | null {
  if (att.content) {
    return `data:${att.content_type ?? "application/octet-stream"};base64,${att.content}`;
  }
  return att.download_url ?? null;
}

function textFromBase64(content: string): string | null {
  try {
    const binary = window.atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

function openAttachment(att: ResendInboundAttachment) {
  if (!att.content && att.download_url) {
    window.open(att.download_url, "_blank", "noopener,noreferrer");
    return;
  }
  if (!att.content) return;
  const blob = base64ToBlob(att.content, att.content_type ?? "application/octet-stream");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadAttachment(att: ResendInboundAttachment, fallbackName: string) {
  if (!att.content && att.download_url) {
    window.open(att.download_url, "_blank", "noopener,noreferrer");
    return;
  }
  if (!att.content) return;
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

function AttachmentInlinePreview({ att, index }: { att: ResendInboundAttachment; index: number }) {
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

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-black/10 bg-slate-50/80 px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--ma-muted)] shadow-sm ring-1 ring-black/5">
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--ma-ink)]">{name}</p>
          <p className="truncate text-[11px] text-[var(--ma-muted)]">
            {type}{size ? ` · ${size}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAttachment(att)}
          disabled={!canOpen}
          className="rounded-full p-1.5 text-[var(--ma-muted)] transition-colors hover:bg-white hover:text-[var(--ma-ink)] disabled:opacity-40"
          title="Apri allegato"
        >
          <ExternalLink size={14} />
        </button>
        <button
          type="button"
          onClick={() => downloadAttachment(att, name)}
          disabled={!canOpen}
          className="rounded-full p-1.5 text-[var(--ma-muted)] transition-colors hover:bg-white hover:text-[var(--ma-ink)] disabled:opacity-40"
          title="Scarica allegato"
        >
          <Download size={14} />
        </button>
      </div>

      {src && isImage ? (
        <div className="bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={name} className="max-h-[520px] w-full object-contain" />
        </div>
      ) : src && isPdf ? (
        <iframe
          src={src}
          title={name}
          className="h-[520px] w-full bg-white"
        />
      ) : textPreview ? (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          {textPreview}
        </pre>
      ) : (
        <div className="px-4 py-6 text-sm text-[var(--ma-muted)]">
          Anteprima non disponibile per questo formato.
        </div>
      )}
    </div>
  );
}

function HtmlEmailFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    function resize() {
      try {
        const h = iframe!.contentDocument?.documentElement?.scrollHeight;
        if (h && h > 0) iframe!.style.height = `${h + 16}px`;
      } catch {}
    }
    iframe.addEventListener("load", resize);
    return () => iframe.removeEventListener("load", resize);
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={buildEmailSrcDoc(html)}
      className="w-full rounded-2xl border border-black/10 bg-white shadow-sm"
      style={{ minHeight: "360px", height: "400px" }}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      title="Corpo email"
    />
  );
}

function EmailMessageBody({ message }: { message: InboundEmail }) {
  return (
    <div className="space-y-4">
      {message.html_body ? (
        <HtmlEmailFrame html={message.html_body} />
      ) : message.text_body ? (
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <PlainTextEmail text={message.text_body} />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-black/10 bg-white/70 p-4 text-sm text-[var(--ma-muted)]">
          (Nessun contenuto)
        </p>
      )}

      {message.attachments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ma-muted)]">
            <Paperclip size={13} />
            Allegati
          </div>
          {message.attachments.map((att, i) => (
            <AttachmentInlinePreview key={`${att.filename ?? "attachment"}-${i}`} att={att} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LeadPanel ────────────────────────────────────────────────────────────────

type LeadPanelProps = {
  emailId: string;
  linkedLeadId: string | null;
  autoMatches: LeadMatch[];
  onLinked: (leadId: string | null) => void;
};

function LeadPanel({ emailId, linkedLeadId, autoMatches, onLinked }: LeadPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<LeadMatch[]>([]);
  const [searching, setSearching]       = useState(false);
  const [open, setOpen]                 = useState(false);
  const [linkedLead, setLinkedLead]     = useState<LeadMatch | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!linkedLeadId) { setLinkedLead(null); return; }
    if (linkedLead?.id === linkedLeadId) return;
    let cancelled = false;
    getLeadsByIds([linkedLeadId])
      .then((rows) => { if (!cancelled) setLinkedLead(rows[0] ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [linkedLeadId, linkedLead?.id]);

  function handleSearch(q: string) {
    setSearchQuery(q);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const r = await searchLeads(q);
        setSearchResults(r);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function handleLink(leadId: string | null) {
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

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex max-w-[220px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
          linkedLeadId
            ? "border-[var(--ma-accent)]/20 bg-[var(--ma-accent)]/8 text-[var(--ma-ink)]"
            : "border-black/10 bg-white/70 text-[var(--ma-muted)] hover:bg-white hover:text-[var(--ma-ink)]",
        )}
        title={linkedLead ? `Lead collegato: ${linkedLead.business_name}` : "Collega lead"}
      >
        <Link2 size={12} />
        <span className="truncate">{leadLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-80 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ma-muted)]">
              Lead collegato
            </p>
            {linkedLeadId && (
              <button
                onClick={() => handleLink(null)}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                title="Scollega"
              >
                <X size={12} />
                Scollega
              </button>
            )}
          </div>

          {linkedLeadId && (
            <div className="mb-2 rounded-xl bg-[var(--ma-surface)] px-3 py-2 text-sm font-medium text-[var(--ma-ink)]">
              {linkedLead ? (
                <>
                  {linkedLead.business_name}
                  <span className="mt-0.5 block truncate text-xs font-normal text-[var(--ma-muted)]">
                    {linkedLead.contact_name || linkedLead.contact_email}
                  </span>
                </>
              ) : (
                <span className="text-[var(--ma-muted)]">Caricamento...</span>
              )}
            </div>
          )}

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ma-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cerca per nome o email..."
              className="menuary-admin-input w-full !pl-8 !py-1.5 text-sm"
            />
          </div>

          {searching && (
            <p className="mt-2 text-xs text-[var(--ma-muted)]">Ricerca...</p>
          )}

          {displayResults.length > 0 && (
            <ul className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-[var(--ma-line)] bg-[var(--ma-paper)] divide-y divide-[var(--ma-line)]">
              {displayResults.map((lead) => (
                <li key={lead.id}>
                  <button
                    onClick={() => handleLink(lead.id)}
                    disabled={isPending}
                    className="w-full px-3 py-2 text-left transition-colors hover:bg-[var(--ma-surface)]"
                  >
                    <span className="block truncate text-sm font-medium text-[var(--ma-ink)]">
                      {lead.business_name}
                    </span>
                    <span className="block truncate text-xs text-[var(--ma-muted)]">
                      {lead.contact_name} · {lead.contact_email} ·{" "}
                      {lead.business_vertical ? (VERTICAL_LABELS[lead.business_vertical] ?? lead.business_vertical) : "N/D"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!searching && searchQuery.trim() && searchResults.length === 0 && (
            <p className="mt-2 text-xs text-[var(--ma-muted)]">Nessun lead trovato</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AssignPanel ──────────────────────────────────────────────────────────────

type AssignPanelProps = {
  emailId: string;
  assignedToUserId: string | null;
  brand: InboundEmail["brand"];
  onAssigned: (emailId: string, siteadminId: string | null) => void;
};

function AssignPanel({ emailId, assignedToUserId, brand, onAssigned }: AssignPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen]               = useState(false);
  const [users, setUsers]             = useState<SiteadminAssignee[]>([]);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSiteadminForAssignment()
      .then((u) => { if (!cancelled) setUsers(u); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function handleAssign(siteadminId: string | null) {
    startTransition(async () => {
      await assignEmail(emailId, siteadminId);
      onAssigned(emailId, siteadminId);
      setOpen(false);
    });
  }

  const currentUser = users.find((u) => u.id === assignedToUserId);
  const currentName = currentUser ? formatAssigneeName(currentUser) : assignedToUserId ? "Assegnata" : "Assegna";
  const currentCompanyEmail = currentUser ? companyEmailForAssignee(currentUser, brand) : null;

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex max-w-[220px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
          assignedToUserId
            ? "border-[var(--ma-accent)]/20 bg-[var(--ma-accent)]/8 text-[var(--ma-ink)]"
            : "border-black/10 bg-white/70 text-[var(--ma-muted)] hover:bg-white hover:text-[var(--ma-ink)]",
        )}
        title={currentCompanyEmail ? `${currentName} · ${currentCompanyEmail}` : "Assegna mail"}
      >
        <UserCheck size={12} />
        <span className="truncate">{currentName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-80 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ma-muted)]">
              Assegnata a
            </p>
            {assignedToUserId && (
              <button
                onClick={() => handleAssign(null)}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                title="Rimuovi assegnazione"
              >
                <X size={12} />
                Rimuovi
              </button>
            )}
          </div>

          {currentUser && (
            <div className="mb-2 rounded-xl bg-[var(--ma-surface)] px-3 py-2">
              <p className="truncate text-sm font-semibold text-[var(--ma-ink)]">{formatAssigneeName(currentUser)}</p>
              <p className="truncate text-xs text-[var(--ma-muted)]">{companyEmailForAssignee(currentUser, brand)}</p>
            </div>
          )}

          {loading && <p className="text-xs text-[var(--ma-muted)]">Caricamento...</p>}

          {!loading && users.length > 0 && (
            <ul className="max-h-72 overflow-y-auto rounded-xl border border-[var(--ma-line)] bg-[var(--ma-paper)] divide-y divide-[var(--ma-line)]">
              {users.map((user) => {
                const companyEmail = companyEmailForAssignee(user, brand);
                return (
                  <li key={user.id}>
                    <button
                      onClick={() => handleAssign(user.id)}
                      disabled={isPending}
                      className={cn(
                        "w-full px-3 py-2 text-left transition-colors",
                        user.id === assignedToUserId
                          ? "bg-[var(--ma-accent)]/10"
                          : "hover:bg-[var(--ma-surface)]",
                      )}
                    >
                      <span className="block truncate text-sm font-medium text-[var(--ma-ink)]">
                        {formatAssigneeName(user)}
                      </span>
                      <span className="block truncate text-xs text-[var(--ma-muted)]">
                        {companyEmail} · {user.role}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EmailDetail ──────────────────────────────────────────────────────────────

export function EmailDetail({ email, threadEmails, onClose, onMutated, onReply, onAssigned, mode = "platform", scope }: Props) {
  const [isPending, startTransition] = useTransition();
  const [starred, setStarred]           = useState(email.starred);
  const [assignedUserId, setAssignedUserId] = useState(email.assigned_to_user_id);
  const [linkedLeadId, setLinkedLeadId] = useState(email.lead_id);
  const [autoMatches, setAutoMatches]   = useState<LeadMatch[]>([]);
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
    if (mode !== "platform") return;
    findLeadsByEmails([email.from_address])
      .then(setAutoMatches)
      .catch(() => {});
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
    if (!confirm("Eliminare definitivamente questa email?")) return;
    startTransition(async () => {
      await deleteEmail(email.id, scope);
      onClose();
      onMutated();
    });
  }

  function handleSpam() {
    if (
      !email.spam &&
      !confirm("Segnare come spam? Le prossime email di questo mittente finiranno automaticamente nello spam.")
    ) {
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

  return (
    <div className="flex h-full flex-col bg-white/65 backdrop-blur-xl">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-black/10 bg-white/75 px-5 py-3 backdrop-blur-xl">
        <button
          onClick={onClose}
          className="menuary-admin-nav-link mr-2 !w-auto gap-1.5 !px-2 !py-1.5 text-sm"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Indietro</span>
        </button>

        <button
          onClick={handleStar}
          disabled={isPending}
          className={cn("menuary-admin-nav-link !w-auto !px-2 !py-1.5", starred && "text-yellow-500")}
          title={starred ? "Rimuovi stella" : "Aggiungi stella"}
        >
          <Star size={16} fill={starred ? "currentColor" : "none"} />
        </button>

        <button
          onClick={handleMarkUnread}
          disabled={isPending}
          className="menuary-admin-nav-link !w-auto !px-2 !py-1.5 text-xs"
          title="Segna come non letta"
        >
          Non letta
        </button>

        <div className="flex-1" />

        {onReply && (
          <button
            onClick={() => onReply(email)}
            className="menuary-admin-nav-link !w-auto !px-2 !py-1.5"
            title="Rispondi"
          >
            <Reply size={16} />
          </button>
        )}

        <button
          onClick={handleSpam}
          disabled={isPending}
          className={cn("menuary-admin-nav-link !w-auto !px-2 !py-1.5", email.spam ? "text-emerald-600" : "text-orange-500")}
          title={email.spam ? "Non è spam: sblocca il mittente" : "Segna come spam e blocca il mittente"}
        >
          {email.spam ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
        </button>

        <button
          onClick={handleArchive}
          disabled={isPending}
          className="menuary-admin-nav-link !w-auto !px-2 !py-1.5"
          title="Archivia"
        >
          <Archive size={16} />
        </button>

        <button
          onClick={handleDelete}
          disabled={isPending}
          className="menuary-admin-nav-link !w-auto !px-2 !py-1.5 text-red-500"
          title="Elimina"
        >
          <Trash2 size={16} />
        </button>

        <button
          onClick={onClose}
          className="menuary-admin-nav-link !w-auto !px-2 !py-1.5 lg:hidden"
        >
          <X size={16} />
        </button>
      </div>

      {/* Header email */}
      <div className="border-b border-black/10 bg-white/60 px-5 py-4">
        <div className="mb-2 flex flex-wrap items-start gap-2">
          <h2 className="flex-1 text-xl font-semibold tracking-[-0.01em] text-[var(--ma-ink)] leading-snug">
            {email.subject || "(nessun oggetto)"}
          </h2>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              BRAND_BADGE[email.brand] ?? "bg-gray-100 text-gray-600",
            )}
          >
            {email.brand}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--ma-muted)]">
          <span>
            <span className="font-medium text-[var(--ma-ink)]">Da:</span> {displayFrom}
          </span>
          <span>
            <span className="font-medium text-[var(--ma-ink)]">A:</span>{" "}
            {email.to_addresses.join(", ")}
          </span>
          <span>{fmtDate(email.created_at)}</span>
        </div>

        {(messages.length > 1 || threadAttachmentCount > 0 || mode === "platform") && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--ma-muted)]">
            {messages.length > 1 && (
              <span className="rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-black/5">
                {messages.length} messaggi nel thread
              </span>
            )}
            {threadAttachmentCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-black/5">
                <Paperclip size={12} />
                {threadAttachmentCount} allegat{threadAttachmentCount === 1 ? "o" : "i"}
              </span>
            )}
            {mode === "platform" && (
              <>
                <AssignPanel
                  emailId={email.id}
                  assignedToUserId={assignedUserId}
                  brand={email.brand}
                  onAssigned={(id, sid) => {
                    setAssignedUserId(sid);
                    onAssigned?.(id, sid);
                  }}
                />
                <LeadPanel
                  emailId={email.id}
                  linkedLeadId={linkedLeadId}
                  autoMatches={autoMatches}
                  onLinked={setLinkedLeadId}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Corpo email */}
      <div className="flex-1 overflow-y-auto bg-[var(--ma-surface)]/35 p-5">
        <div className="mx-auto max-w-4xl space-y-4">
          {messages.map((message) => {
            const from = message.from_name
              ? `${message.from_name} <${message.from_address}>`
              : message.from_address;
            return (
              <article key={message.id} className="rounded-[1.35rem] border border-black/10 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ma-ink)]">{from}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--ma-muted)]">
                      A: {message.to_addresses.join(", ")}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs font-medium text-[var(--ma-muted)]">
                    {fmtDate(message.created_at)}
                  </time>
                </div>
                <EmailMessageBody message={message} />
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
