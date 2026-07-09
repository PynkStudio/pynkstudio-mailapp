"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { Mail, RefreshCw, Settings } from "lucide-react";
import { cn } from "../utils";

import { MailSidebar } from "./mail-sidebar";
import { EmailList } from "./email-list";
import { EmailDetail } from "./email-detail";
import { SentDetail } from "./sent-detail";
import { ComposeDrawer, type ComposeAttachment } from "./compose-drawer";
import { TenantMailDeviceSettings } from "./tenant-mail-device-settings";

import { getInboundEmails, getTenantInboxUnreadCount, markEmailRead } from "../email/inbound-queries";
import { getSentDeliveryIssueCount, getSentEmails } from "../email/sent-queries";
import { getTrackingSummariesForEmails } from "../email/tracking-queries";
import type { TrackingSummary } from "../email/tracking-queries";
import { getDeviceId } from "../push/device-id";
import { getMailDeviceFilter, type MailDeviceFilter } from "../email/mail-device-filters";

import type { InboxPage } from "../email/inbound-queries";
import type { SentPage, SentEmail } from "../email/sent-queries";
import type { InboundEmail } from "../email/inbound-types";
import type { MailView, BrandFilter } from "./mail-sidebar";
import type { TenantEmailScope } from "../email/tenant-email-scope";

type Props = {
  initialInbox: InboxPage;
  initialSent: SentPage;
  unreadTotal: number;
  unreadMine: number;
  deliveryIssueCount?: number;
  currentSiteadminId: string | null;
  canCompose: boolean;
  mode?: "platform" | "tenant";
  scope?: TenantEmailScope;
  tenantId?: string;
  tenantName?: string;
  tenantFromAddress?: string;
  currentUserEmail?: string | null;
};

type ComposePrefill = {
  to?: string;
  subject?: string;
  body?: string;
  brand?: InboundEmail["brand"];
  preferredFromAddress?: string;
  attachments?: ComposeAttachment[];
};

// Adatta SentEmail alla forma che EmailList si aspetta per il pannello inviata
function sentToListItem(e: SentEmail): InboundEmail {
  return {
    id:           e.id,
    created_at:   e.created_at,
    message_id:   e.resend_message_id,
    from_address: e.from_address,
    from_name:    e.from_name,
    to_addresses: e.to_addresses,
    subject:      e.subject,
    text_body:    null,
    html_body:    e.html_body,
    headers:      [],
    attachments:  [],
    brand:                e.brand,
    read:                 true,
    starred:              false,
    archived:             false,
    spam:                 false,
    lead_id:              e.lead_id,
    assigned_to_user_id:  null,
  };
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function quoteText(text: string): string {
  return text.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
}

function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}

function normalizeThreadSubject(subject: string): string {
  return (subject || "(nessun oggetto)")
    .trim()
    .replace(/^(\s*(re|fw|fwd|rif|i)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function threadKeyForEmail(email: InboundEmail): string {
  const subject = normalizeThreadSubject(email.subject);
  const people = [email.from_address, ...email.to_addresses]
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|");
  return `${subject}::${people}`;
}

function groupInboundThreads(emails: InboundEmail[]) {
  const groups = new Map<string, InboundEmail[]>();
  for (const email of emails) {
    const key = threadKeyForEmail(email);
    const existing = groups.get(key);
    if (existing) existing.push(email);
    else groups.set(key, [email]);
  }

  return Array.from(groups.values())
    .map((items) => {
      const sortedDesc = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sortedDesc[0];
      return {
        latest,
        items: sortedDesc,
        unreadCount: sortedDesc.filter((item) => !item.read).length,
        attachmentCount: sortedDesc.reduce((sum, item) => sum + item.attachments.length, 0),
      };
    })
    .sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());
}

function buildReplyBody(email: InboundEmail): string {
  const original = email.text_body ?? (email.html_body ? htmlToText(email.html_body) : "");
  const from = email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address;
  const date = new Date(email.created_at).toLocaleString("it-IT", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return `\n\nIl ${date}, ${from} ha scritto:\n${quoteText(original)}`;
}

function composeBrandFromFilter(filter: BrandFilter): InboundEmail["brand"] {
  if (filter === "bizery" || filter === "orpheo") return filter;
  if (filter === "pynkstudio") return filter;
  return "menuary";
}

const BRAND_DOMAINS: Record<InboundEmail["brand"], string[]> = {
  menuary:    ["menuary.it"],
  bizery:     ["bizery.it"],
  orpheo:     ["weuseorpheo.com"],
  pynkstudio: ["pynkstudio.it", "pynkstudio.com", "pynkstudio.eu"],
};

function pickReplyFromAddress(email: InboundEmail, tenantFromAddress?: string): string | undefined {
  const tenantDomain = tenantFromAddress?.split("@")[1]?.toLowerCase();
  if (tenantDomain) {
    const tenantMatch = email.to_addresses.find((address) => address.toLowerCase().endsWith(`@${tenantDomain}`));
    if (tenantMatch) return tenantMatch;
  }

  const brandDomains = BRAND_DOMAINS[email.brand] ?? [];
  const brandMatch = email.to_addresses.find((address) => {
    const lower = address.toLowerCase();
    return brandDomains.some((domain) => lower.endsWith(`@${domain}`));
  });
  return brandMatch ?? email.to_addresses[0];
}

export function MailApp({
  initialInbox,
  initialSent,
  unreadTotal,
  unreadMine,
  deliveryIssueCount = 0,
  currentSiteadminId,
  canCompose,
  mode = "platform",
  scope,
  tenantId,
  tenantName,
  tenantFromAddress,
  currentUserEmail,
}: Props) {
  const [view, setView]         = useState<MailView>("inbox");
  const [brand, setBrand]       = useState<BrandFilter>("all");
  const [inbox, setInbox]       = useState(initialInbox);
  const [sent, setSent]         = useState(initialSent);
  const [unread, setUnread]     = useState(unreadTotal);
  const [unreadMyCount, setUnreadMyCount] = useState(unreadMine);
  const [deliveryIssues, setDeliveryIssues] = useState(deliveryIssueCount);
  const [selectedInbound, setSelectedInbound] = useState<InboundEmail | null>(null);
  const [selectedSent, setSelectedSent]       = useState<SentEmail | null>(null);
  const [composeOpen, setComposeOpen]         = useState(false);
  const [composePrefill, setComposePrefill]   = useState<ComposePrefill>({});
  const [sentTrackingMap, setSentTrackingMap] = useState<Record<string, TrackingSummary>>({});
  const [isPending, startTransition]          = useTransition();
  const [deviceFilter, setDeviceFilter]       = useState<MailDeviceFilter | null>(null);
  const [deviceSettingsOpen, setDeviceSettingsOpen] = useState(false);

  const prevInboxIdsRef = useRef<Set<string>>(new Set(initialInbox.emails.map((e) => e.id)));
  const mineAvailable = mode !== "tenant" || Boolean(deviceFilter?.localParts.length);

  useEffect(() => {
    const ids = initialSent.emails.map((e) => e.resend_message_id).filter(Boolean) as string[];
    if (ids.length > 0) {
      getTrackingSummariesForEmails(ids).then(setSentTrackingMap).catch(() => {});
    }
  }, [initialSent]);

  // Filtro "per dispositivo" (tenant, senza account): caricato dal localStorage/DB al mount.
  useEffect(() => {
    if (mode !== "tenant" || !tenantId) return;
    let cancelled = false;
    getMailDeviceFilter(tenantId, getDeviceId())
      .then((filter) => { if (!cancelled) setDeviceFilter(filter?.localParts.length ? filter : null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mode, tenantId]);

  const refreshSidebarCounters = useCallback(async () => {
    try {
      if (mode === "tenant") {
        if (!scope) return;
        const [inboxUnread, mineUnread, issueCount] = await Promise.all([
          getTenantInboxUnreadCount(scope),
          deviceFilter?.localParts.length ? getTenantInboxUnreadCount(scope, deviceFilter.localParts) : Promise.resolve(0),
          getSentDeliveryIssueCount(brand, scope),
        ]);
        setUnread(inboxUnread);
        setUnreadMyCount(mineUnread);
        setDeliveryIssues(issueCount);
        return;
      }
      const [inboxAll, mineAll, issueCount] = await Promise.all([
        getInboundEmails({ brand: "all", scope }),
        currentSiteadminId
          ? getInboundEmails({ brand: "all", assignedToUserId: currentSiteadminId, scope })
          : Promise.resolve({ emails: [], total: 0, page: 1, pageSize: 0 } as InboxPage),
        getSentDeliveryIssueCount(brand, scope),
      ]);
      setUnread(inboxAll.emails.filter((e) => !e.read).length);
      setUnreadMyCount(mineAll.emails.filter((e) => !e.read).length);
      setDeliveryIssues(issueCount);
    } catch {
      /* noop */
    }
  }, [currentSiteadminId, scope, mode, deviceFilter, brand]);

  const reload = useCallback(
    (v: MailView = view, b: BrandFilter = brand) => {
      startTransition(async () => {
        if (v === "sent" || v === "issues") {
          const fresh = await getSentEmails(b, 1, scope, { onlyDeliveryIssues: v === "issues" });
          setSent(fresh);
          const ids = fresh.emails.map((e) => e.resend_message_id).filter(Boolean) as string[];
          const tracking = await getTrackingSummariesForEmails(ids);
          setSentTrackingMap(tracking);
        } else {
          const fresh = await getInboundEmails({
            brand:             b,
            onlyUnread:        v === "unread",
            onlyStarred:       v === "starred",
            archived:          v === "archived",
            spam:              v === "spam",
            assignedToUserId:  v === "mine" && mode !== "tenant" && currentSiteadminId ? currentSiteadminId : undefined,
            matchLocalParts:   v === "mine" && mode === "tenant" ? deviceFilter?.localParts : undefined,
            scope,
          });
          setInbox(fresh);
          if (v === "inbox") {
            const incomingIds = fresh.emails.map((e) => e.id);
            const hasNew = incomingIds.some((id) => !prevInboxIdsRef.current.has(id));
            prevInboxIdsRef.current = new Set(incomingIds);
            if (hasNew && typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("inbox:refresh"));
            }
          }
        }
        await refreshSidebarCounters();
      });
    },
    [view, brand, currentSiteadminId, refreshSidebarCounters, scope, mode, deviceFilter],
  );

  function handleDeviceFilterChange(filter: MailDeviceFilter | null) {
    setDeviceFilter(filter);
    void refreshSidebarCounters();
    if (view === "mine") reload("mine", brand);
  }

  // Polling + refresh su focus per aggiornamento automatico inbox.
  useEffect(() => {
    const tick = () => reload();
    const interval = setInterval(tick, 25_000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, [reload]);

  function handleAssigned(emailId: string, siteadminId: string | null) {
    setInbox((prev) => ({
      ...prev,
      emails: prev.emails.map((e) =>
        e.id === emailId ? { ...e, assigned_to_user_id: siteadminId } : e,
      ),
    }));
    if (selectedInbound?.id === emailId) {
      setSelectedInbound((prev) => prev ? { ...prev, assigned_to_user_id: siteadminId } : prev);
    }
  }

  function handleViewChange(v: MailView) {
    setView(v);
    setSelectedInbound(null);
    setSelectedSent(null);
    reload(v, brand);
  }

  function handleBrandChange(b: BrandFilter) {
    setBrand(b);
    setSelectedInbound(null);
    setSelectedSent(null);
    reload(view, b);
  }

  async function handleSelectInbound(email: InboundEmail) {
    setSelectedInbound(email);
    setSelectedSent(null);
    const threadItems = threadByLatestId[email.id] ?? [email];
    const unreadThreadItems = threadItems.filter((item) => !item.read);
    if (unreadThreadItems.length > 0) {
      await Promise.all(unreadThreadItems.map((item) => markEmailRead(item.id, true, scope)));
      const unreadIds = new Set(unreadThreadItems.map((item) => item.id));
      setInbox((prev) => ({
        ...prev,
        emails: prev.emails.map((e) => unreadIds.has(e.id) ? { ...e, read: true } : e),
      }));
      setUnread((n) => Math.max(0, n - unreadThreadItems.length));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:refresh"));
      }
    }
  }

  function handleSelectSent(item: InboundEmail) {
    const original = sent.emails.find((e) => e.id === item.id) ?? null;
    setSelectedSent(original);
    setSelectedInbound(null);
  }

  function openBlankCompose() {
    setComposePrefill({});
    setComposeOpen(true);
  }

  function handleReply(email: InboundEmail) {
    setComposePrefill({
      to: email.from_address,
      subject: replySubject(email.subject),
      body: buildReplyBody(email),
      brand: email.brand,
      preferredFromAddress: pickReplyFromAddress(email, tenantFromAddress),
    });
    setComposeOpen(true);
  }

  const isSentView = view === "sent" || view === "issues";
  const inboundThreads = isSentView ? [] : groupInboundThreads(inbox.emails);
  const threadByLatestId = Object.fromEntries(inboundThreads.map((thread) => [thread.latest.id, thread.items]));
  const threadCountMap = Object.fromEntries(inboundThreads.map((thread) => [thread.latest.id, thread.items.length]));
  const threadUnreadMap = Object.fromEntries(inboundThreads.map((thread) => [thread.latest.id, thread.unreadCount]));
  const threadAttachmentMap = Object.fromEntries(inboundThreads.map((thread) => [thread.latest.id, thread.attachmentCount]));
  const listEmails = isSentView
    ? sent.emails.map(sentToListItem)
    : inboundThreads.map((thread) => thread.latest);
  const sentStatusMap = Object.fromEntries(sent.emails.map((email) => [email.id, email.status]));

  const selectedListId = isSentView ? selectedSent?.id ?? null : selectedInbound?.id ?? null;
  const showDetail = isSentView ? selectedSent !== null : selectedInbound !== null;

  return (
    <>
      <div className="menuary-admin-card overflow-hidden p-0">
        <div className="flex h-[calc(100vh-4rem)] min-h-[640px] rounded-[inherit] bg-white/45 backdrop-blur-xl max-lg:h-[calc(100vh-5rem)]">
          {/* Sidebar */}
          <div className="hidden lg:flex">
            <MailSidebar
              view={view}
              brand={brand}
              unreadCount={unread}
              unreadMine={unreadMyCount}
              deliveryIssueCount={deliveryIssues}
              canCompose={canCompose}
              mode={mode}
              mineAvailable={mineAvailable}
              onViewChange={handleViewChange}
              onBrandChange={handleBrandChange}
              onCompose={openBlankCompose}
              onOpenDeviceSettings={mode === "tenant" && tenantId ? () => setDeviceSettingsOpen(true) : undefined}
            />
          </div>

          {/* Lista */}
          <div className={cn(
            "flex h-full flex-col overflow-hidden border-r border-black/10 bg-[var(--ma-surface)]/55",
            showDetail ? "hidden lg:flex lg:w-72 xl:w-80" : "flex-1",
          )}>
            {/* Toolbar lista */}
            <div className="flex items-center justify-between border-b border-black/10 bg-white/45 px-4 py-2.5 backdrop-blur-xl">
              {/* Mobile: filtri brand + vista */}
              <div className="flex flex-wrap gap-1 lg:hidden">
                {(["inbox","unread","mine","sent","issues","starred","spam","archived"] as MailView[])
                  .filter((v) => v !== "mine" || mineAvailable)
                  .map((v) => (
                  <button
                    key={v}
                    onClick={() => handleViewChange(v)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors capitalize",
                      view === v
                        ? "bg-[var(--ma-accent)] text-white"
                        : "bg-[var(--ma-surface)] text-[var(--ma-muted)]",
                    )}
                  >
                    {v === "inbox" ? "Arrivo" : v === "unread" ? "Non lette" : v === "mine" ? "Le mie" : v === "sent" ? "Inviata" : v === "issues" ? "Problemi" : v === "starred" ? "Stellate" : v === "spam" ? "Spam" : "Archivio"}
                  </button>
                ))}
                {mode === "platform" && (["all","pynkstudio","menuary","bizery","orpheo","support"] as BrandFilter[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => handleBrandChange(b)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                      brand === b
                        ? "bg-[var(--ma-line)] text-[var(--ma-ink)]"
                        : "bg-[var(--ma-surface)] text-[var(--ma-muted)]",
                    )}
                  >
                    {b === "all" ? "Tutte" : b === "pynkstudio" ? "Pynk" : b === "menuary" ? "Menuary" : b === "bizery" ? "Bizery" : b === "orpheo" ? "Orpheo" : "Supporto"}
                  </button>
                ))}
              </div>
              <p className="hidden text-xs font-medium text-[var(--ma-muted)] lg:block">
                {isSentView ? sent.total : `${inboundThreads.length} thread`} · {isSentView ? (view === "issues" ? "problemi" : "email") : `${inbox.total} email`}
              </p>
              <div className="flex items-center gap-1">
                {mode === "tenant" && tenantId && (
                  <button
                    onClick={() => setDeviceSettingsOpen(true)}
                    className="menuary-admin-nav-link !w-auto !p-1.5 lg:hidden"
                    title="Questo dispositivo"
                  >
                    <Settings size={13} />
                  </button>
                )}
                <button
                  onClick={() => reload()}
                  disabled={isPending}
                  className="menuary-admin-nav-link !w-auto !p-1.5"
                  title="Aggiorna"
                >
                  <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <EmailList
                emails={listEmails}
                selectedId={selectedListId}
                onSelect={isSentView ? handleSelectSent : handleSelectInbound}
                trackingMap={isSentView ? sentTrackingMap : undefined}
                sentStatusMap={isSentView ? sentStatusMap : undefined}
                threadCountMap={isSentView ? undefined : threadCountMap}
                threadUnreadMap={isSentView ? undefined : threadUnreadMap}
                threadAttachmentMap={isSentView ? undefined : threadAttachmentMap}
              />
            </div>
          </div>

          {/* Dettaglio */}
          {showDetail ? (
            <div className="flex-1 overflow-hidden">
              {isSentView && selectedSent ? (
                <SentDetail
                  email={selectedSent}
                  onClose={() => setSelectedSent(null)}
                />
              ) : selectedInbound ? (
                <EmailDetail
                  email={selectedInbound}
                  onClose={() => setSelectedInbound(null)}
                  onMutated={() => reload()}
                  onReply={handleReply}
                  onAssigned={handleAssigned}
                  mode={mode}
                  scope={scope}
                  threadEmails={threadByLatestId[selectedInbound.id] ?? [selectedInbound]}
                />
              ) : null}
            </div>
          ) : (
            <div className="hidden flex-1 items-center justify-center text-[var(--ma-muted)] lg:flex">
              <div className="text-center">
                <Mail size={36} className="mx-auto mb-2 opacity-25" />
                <p className="text-sm">Seleziona un&apos;email</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: scrivi */}
      {canCompose && (
        <button
          onClick={openBlankCompose}
          className="menuary-admin-action-btn fixed bottom-6 right-6 z-40 flex items-center gap-2 shadow-lg lg:hidden"
        >
          ✏️ Scrivi
        </button>
      )}

      <ComposeDrawer
        open={composeOpen}
        canCompose={canCompose}
        defaultBrand={composePrefill.brand ?? composeBrandFromFilter(brand)}
        tenantId={tenantId}
        fromAddress={tenantFromAddress}
        fromName={tenantName}
        currentUserEmail={currentUserEmail}
        lockBrand={mode === "tenant"}
        preferredFromAddress={composePrefill.preferredFromAddress}
        initialTo={composePrefill.to}
        initialSubject={composePrefill.subject}
        initialBody={composePrefill.body}
        initialAttachments={composePrefill.attachments}
        onClose={() => setComposeOpen(false)}
        onSent={() => { if (view === "sent" || view === "issues") reload(view, brand); }}
      />

      {mode === "tenant" && tenantId && (
        <TenantMailDeviceSettings
          open={deviceSettingsOpen}
          tenantId={tenantId}
          onClose={() => setDeviceSettingsOpen(false)}
          onFilterChange={handleDeviceFilterChange}
        />
      )}
    </>
  );
}
