"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, Link2, Search, X } from "lucide-react";
import { cn } from "../utils";
import { getTrackingEventsForEmail } from "../email/tracking-queries";
import { TRACKING_EVENT_LABELS, TRACKING_EVENT_COLORS } from "../email/tracking-types";
import { findLeadsByEmails, searchLeads, linkSentEmailToLead, getLeadsByIds } from "../email/lead-link-queries";
import { buildEmailSrcDoc } from "../email/render-html";
import type { SentEmail } from "../email/sent-queries";
import type { TrackingEvent } from "../email/tracking-queries";
import type { ResendTrackingEventType } from "../email/tracking-types";
import type { LeadMatch } from "../email/lead-link-queries";

type Props = {
  email: SentEmail;
  onClose: () => void;
};

const STATUS_BADGE: Record<SentEmail["status"], string> = {
  sent:             "bg-blue-50 text-blue-600",
  delivered:        "bg-green-50 text-green-600",
  delivery_delayed: "bg-yellow-50 text-yellow-600",
  bounced:          "bg-red-50 text-red-600",
  complained:       "bg-orange-50 text-orange-600",
};

const STATUS_LABELS: Record<SentEmail["status"], string> = {
  sent:             "Inviata",
  delivered:        "Consegnata",
  delivery_delayed: "Ritardo consegna",
  bounced:          "Rimbalzata",
  complained:       "Segnata spam",
};

const VERTICAL_LABELS: Record<string, string> = {
  food: "Menuary",
  services: "Bizery",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
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
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState<LeadMatch[]>([]);
  const [searching, setSearching]         = useState(false);
  const [open, setOpen]                   = useState(false);
  const [linkedLead, setLinkedLead]       = useState<LeadMatch | null>(null);
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
      await linkSentEmailToLead(emailId, leadId);
      onLinked(leadId);
      setOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    });
  }

  const displayResults = searchQuery.trim() ? searchResults : autoMatches;

  return (
    <div className="border-b border-[var(--ma-line)] px-5 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ma-muted)]">
          Lead collegato
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="menuary-admin-nav-link !w-auto !px-2 !py-1 text-xs gap-1"
        >
          <Link2 size={12} />
          {linkedLeadId ? "Cambia" : "Collega"}
        </button>
      </div>

      {linkedLeadId ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="flex-1 rounded-lg bg-[var(--ma-surface)] px-3 py-1.5 text-sm font-medium text-[var(--ma-ink)]">
            {linkedLead ? (
              <>
                {linkedLead.business_name}
                <span className="ml-1 text-xs font-normal text-[var(--ma-muted)]">
                  · {linkedLead.contact_name || linkedLead.contact_email}
                </span>
              </>
            ) : (
              <span className="text-[var(--ma-muted)]">Caricamento…</span>
            )}
          </span>
          <button
            onClick={() => handleLink(null)}
            disabled={isPending}
            className="menuary-admin-nav-link !w-auto !px-2 !py-1 text-xs text-red-500"
            title="Scollega"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <p className="mt-1 text-xs text-[var(--ma-muted)]">Nessun lead collegato</p>
      )}

      {open && (
        <div className="mt-2 space-y-1.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ma-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cerca per nome o email…"
              className="menuary-admin-input w-full !pl-8 !py-1.5 text-sm"
            />
          </div>

          {searching && <p className="text-xs text-[var(--ma-muted)]">Ricerca…</p>}

          {displayResults.length > 0 && (
            <ul className="rounded-lg border border-[var(--ma-line)] bg-[var(--ma-paper)] divide-y divide-[var(--ma-line)] overflow-hidden">
              {displayResults.map((lead) => (
                <li key={lead.id}>
                  <button
                    onClick={() => handleLink(lead.id)}
                    disabled={isPending}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--ma-surface)] transition-colors"
                  >
                    <span className="block text-sm font-medium text-[var(--ma-ink)]">
                      {lead.business_name}
                    </span>
                    <span className="block text-xs text-[var(--ma-muted)]">
                      {lead.contact_name} · {lead.contact_email} ·{" "}
                      {lead.business_vertical ? (VERTICAL_LABELS[lead.business_vertical] ?? lead.business_vertical) : "N/D"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!searching && searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-xs text-[var(--ma-muted)]">Nessun lead trovato</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SentDetail ───────────────────────────────────────────────────────────────

export function SentDetail({ email, onClose }: Props) {
  const [events, setEvents]             = useState<TrackingEvent[]>([]);
  const [linkedLeadId, setLinkedLeadId] = useState(email.lead_id);
  const [autoMatches, setAutoMatches]   = useState<LeadMatch[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!email.resend_message_id) return;
    getTrackingEventsForEmail(email.resend_message_id)
      .then(setEvents)
      .catch(console.error);
  }, [email.resend_message_id]);

  // Auto-match dal primo destinatario (email in uscita)
  useEffect(() => {
    const first = email.to_addresses[0];
    if (!first) return;
    findLeadsByEmails([first])
      .then(setAutoMatches)
      .catch(() => {});
  }, [email.to_addresses]);

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
  }, [email.html_body]);

  const displayFrom = email.from_name
    ? `${email.from_name} <${email.from_address}>`
    : email.from_address;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--ma-line)] px-5 py-3">
        <button
          onClick={onClose}
          className="menuary-admin-nav-link mr-2 !w-auto gap-1.5 !px-2 !py-1.5 text-sm"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Indietro</span>
        </button>
        <div className="flex-1" />
        <button onClick={onClose} className="menuary-admin-nav-link !w-auto !px-2 !py-1.5 lg:hidden">
          <X size={16} />
        </button>
      </div>

      {/* Header */}
      <div className="border-b border-[var(--ma-line)] px-5 py-4">
        <div className="mb-2 flex flex-wrap items-start gap-2">
          <h2 className="flex-1 text-lg font-semibold text-[var(--ma-ink)] leading-snug">
            {email.subject || "(nessun oggetto)"}
          </h2>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", STATUS_BADGE[email.status])}>
            {STATUS_LABELS[email.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--ma-muted)]">
          <span><span className="font-medium text-[var(--ma-ink)]">Da:</span> {displayFrom}</span>
          <span><span className="font-medium text-[var(--ma-ink)]">A:</span> {email.to_addresses.join(", ")}</span>
          <span>{fmtDate(email.created_at)}</span>
        </div>
      </div>

      {/* Tracking timeline */}
      {events.length > 0 && (
        <div className="border-b border-[var(--ma-line)] px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ma-muted)]">Tracking</p>
          <div className="flex flex-wrap gap-2">
            {events.map((ev) => {
              const label = TRACKING_EVENT_LABELS[ev.event_type as ResendTrackingEventType] ?? ev.event_type;
              const color = TRACKING_EVENT_COLORS[ev.event_type as ResendTrackingEventType] ?? "bg-gray-50 text-gray-600";
              const meta = ev.metadata as Record<string, unknown>;
              const clickLink =
                meta.click && typeof meta.click === "object"
                  ? String((meta.click as Record<string, unknown>).link ?? "")
                  : "";
              return (
                <div key={ev.id} className={cn("rounded-lg px-2.5 py-1.5 text-xs", color)}>
                  <span className="font-medium">{label}</span>
                  <span className="ml-1.5 opacity-70">{fmtTime(ev.created_at)}</span>
                  {clickLink && (
                    <span className="ml-1.5 max-w-[140px] truncate align-bottom opacity-70 inline-block">
                      {clickLink}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lead panel */}
      <LeadPanel
        emailId={email.id}
        linkedLeadId={linkedLeadId}
        autoMatches={autoMatches}
        onLinked={setLinkedLeadId}
      />

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto p-5">
        {email.html_body ? (
          <iframe
            ref={iframeRef}
            srcDoc={buildEmailSrcDoc(email.html_body)}
            className="w-full rounded-lg border border-[var(--ma-line)]"
            style={{ minHeight: "400px", height: "400px" }}
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            title="Corpo email"
          />
        ) : (
          <p className="text-sm text-[var(--ma-muted)]">(Nessun contenuto)</p>
        )}
      </div>
    </div>
  );
}
