"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Archive,
  Clapperboard,
  Inbox,
  RefreshCw,
  Star,
  UtensilsCrossed,
  Briefcase,
  Mail,
} from "lucide-react";
import { cn } from "../utils";
import { markEmailRead, getInboundEmails, hydrateInboundEmailContent } from "../email/inbound-queries";
import { EmailList } from "./email-list";
import { EmailDetail } from "./email-detail";
import type { InboundEmail, InboundEmailBrand } from "../email/inbound-types";
import type { InboxPage, InboxFilter } from "../email/inbound-queries";

type BrandFilter = InboundEmailBrand | "all";
type ViewFilter = "inbox" | "starred" | "archived";

type Props = {
  initialData: InboxPage;
};

const BRAND_TABS: { value: BrandFilter; label: string; icon: React.ElementType }[] = [
  { value: "all",     label: "Tutte",   icon: Mail },
  { value: "menuary", label: "Menuary", icon: UtensilsCrossed },
  { value: "bizery",  label: "Bizery",  icon: Briefcase },
  { value: "orpheo",  label: "Orpheo",  icon: Clapperboard },
];

const VIEW_TABS: { value: ViewFilter; label: string; icon: React.ElementType }[] = [
  { value: "inbox",    label: "Arrivo",   icon: Inbox },
  { value: "starred",  label: "Stellate", icon: Star },
  { value: "archived", label: "Archivio", icon: Archive },
];

export function InboxPage({ initialData }: Props) {
  const [data, setData]             = useState<InboxPage>(initialData);
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");
  const [viewFilter, setViewFilter]  = useState<ViewFilter>("inbox");
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [isPending, startTransition]     = useTransition();

  const reload = useCallback(
    (brand: BrandFilter = brandFilter, view: ViewFilter = viewFilter) => {
      startTransition(async () => {
        const filter: InboxFilter = {
          brand: brand === "all" ? "all" : brand,
          onlyStarred: view === "starred",
          archived: view === "archived",
        };
        const fresh = await getInboundEmails(filter);
        setData(fresh);
      });
    },
    [brandFilter, viewFilter],
  );

  function handleBrandFilter(b: BrandFilter) {
    setBrandFilter(b);
    reload(b, viewFilter);
  }

  function handleViewFilter(v: ViewFilter) {
    setViewFilter(v);
    reload(brandFilter, v);
  }

  async function handleSelectEmail(email: InboundEmail) {
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

  return (
    <div className="menuary-admin-inbox">
      {/* Filtri brand */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-[var(--ma-line)] bg-[var(--ma-surface)] p-1">
          {BRAND_TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleBrandFilter(value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                brandFilter === value
                  ? "bg-white text-[var(--ma-ink)] shadow-sm"
                  : "text-[var(--ma-muted)] hover:text-[var(--ma-ink)]",
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-xl border border-[var(--ma-line)] bg-[var(--ma-surface)] p-1">
          {VIEW_TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleViewFilter(value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                viewFilter === value
                  ? "bg-white text-[var(--ma-ink)] shadow-sm"
                  : "text-[var(--ma-muted)] hover:text-[var(--ma-ink)]",
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => reload()}
          disabled={isPending}
          className="menuary-admin-nav-link !w-auto !px-3 !py-1.5 text-sm"
          title="Aggiorna"
        >
          <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Aggiorna</span>
        </button>
      </div>

      {/* Totale */}
      <p className="mb-3 text-xs text-[var(--ma-muted)]">
        {data.total} {data.total === 1 ? "email" : "email"}
        {data.total > data.pageSize && ` · pagina ${data.page}`}
      </p>

      {/* Layout lista + dettaglio */}
      <div className="menuary-admin-card overflow-hidden p-0">
        <div className="flex h-[calc(100vh-220px)] min-h-96">
          {/* Lista — sempre visibile su desktop, nascosta su mobile quando c'è dettaglio */}
          <div
            className={cn(
              "h-full overflow-y-auto border-r border-[var(--ma-line)]",
              showDetail ? "hidden lg:block lg:w-72 xl:w-80" : "w-full",
            )}
          >
            <EmailList
              emails={data.emails}
              selectedId={selectedEmail?.id ?? null}
              onSelect={handleSelectEmail}
            />
          </div>

          {/* Dettaglio */}
          {showDetail ? (
            <div className="flex-1 overflow-hidden">
              <EmailDetail
                email={selectedEmail}
                onClose={() => setSelectedEmail(null)}
                onMutated={() => reload()}
              />
            </div>
          ) : (
            <div className="hidden flex-1 items-center justify-center text-[var(--ma-muted)] lg:flex">
              <div className="text-center">
                <Mail size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Seleziona un&apos;email</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
