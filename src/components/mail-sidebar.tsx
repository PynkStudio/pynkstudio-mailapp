"use client";

import Link from "next/link";
import {
  Archive,
  AlertTriangle,
  Briefcase,
  Clapperboard,
  Heart,
  Inbox,
  LifeBuoy,
  Mail,
  MailOpen,
  Pencil,
  Send,
  Settings,
  ShieldAlert,
  Star,
  UtensilsCrossed,
  UserCheck,
} from "lucide-react";
import { cn } from "../utils";
import type { InboundEmailBrand } from "../email/inbound-types";

export type MailView = "inbox" | "unread" | "mine" | "sent" | "issues" | "starred" | "spam" | "archived";
export type BrandFilter = InboundEmailBrand | "all" | "support";

type Props = {
  view: MailView;
  brand: BrandFilter;
  unreadCount: number;
  unreadMine: number;
  deliveryIssueCount?: number;
  canCompose: boolean;
  mode?: "platform" | "tenant";
  /** Se false nasconde la vista "Le mie" (tenant senza filtro dispositivo configurato). Default true. */
  mineAvailable?: boolean;
  onViewChange: (v: MailView) => void;
  onBrandChange: (b: BrandFilter) => void;
  onCompose: () => void;
  /** Tenant: apre il pannello di configurazione filtro/notifiche per questo dispositivo. */
  onOpenDeviceSettings?: () => void;
};

const VIEWS: { value: MailView; label: string; icon: React.ElementType }[] = [
  { value: "inbox",    label: "Arrivo",    icon: Inbox },
  { value: "unread",   label: "Non lette", icon: MailOpen },
  { value: "mine",     label: "Le mie",    icon: UserCheck },
  { value: "sent",     label: "Inviata",   icon: Send },
  { value: "issues",   label: "Problemi",  icon: AlertTriangle },
  { value: "starred",  label: "Stellate",  icon: Star },
  { value: "spam",     label: "Spam",      icon: ShieldAlert },
  { value: "archived", label: "Archivio",  icon: Archive },
];

const BRANDS: { value: BrandFilter; label: string; icon: React.ElementType }[] = [
  { value: "all",        label: "Tutte",       icon: Mail },
  { value: "pynkstudio", label: "PynkStudio",  icon: Heart },
  { value: "menuary",    label: "Menuary",     icon: UtensilsCrossed },
  { value: "bizery",     label: "Bizery",      icon: Briefcase },
  { value: "orpheo",     label: "Orpheo",      icon: Clapperboard },
  { value: "support",    label: "Supporto",    icon: LifeBuoy },
];

export function MailSidebar({ view, brand, unreadCount, unreadMine, deliveryIssueCount = 0, canCompose, mode = "platform", mineAvailable = true, onViewChange, onBrandChange, onCompose, onOpenDeviceSettings }: Props) {
  const views = VIEWS.filter((item) => item.value !== "mine" || mineAvailable);
  return (
    <div className="flex h-full w-52 shrink-0 flex-col border-r border-black/10 bg-white/55 p-3 backdrop-blur-xl">
      {/* Scrivi */}
      {canCompose && (
        <button
          onClick={onCompose}
          className="menuary-admin-action-btn mb-4 flex w-full items-center justify-center gap-2"
        >
          <Pencil size={14} />
          Scrivi
        </button>
      )}

      {/* Viste */}
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ma-muted)]">
        Cassetta
      </p>
      <nav className="mb-4 space-y-0.5">
        {views.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onViewChange(value)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
              view === value
                ? "bg-white text-[var(--ma-ink)] shadow-sm ring-1 ring-black/5"
                : "text-[var(--ma-muted)] hover:bg-white/65 hover:text-[var(--ma-ink)]",
            )}
          >
            <Icon size={15} />
            {label}
            {(value === "inbox" || value === "unread") && unreadCount > 0 && (
              <span className={cn(
                "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                view === value ? "bg-[var(--ma-accent)]/10 text-[var(--ma-accent)]" : "bg-[var(--ma-accent)] text-white",
              )}>
                {unreadCount}
              </span>
            )}
            {value === "mine" && unreadMine > 0 && (
              <span className={cn(
                "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                view === "mine" ? "bg-[var(--ma-accent)]/10 text-[var(--ma-accent)]" : "bg-[var(--ma-accent)] text-white",
              )}>
                {unreadMine}
              </span>
            )}
            {value === "issues" && deliveryIssueCount > 0 && (
              <span className={cn(
                "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                view === "issues" ? "bg-red-50 text-red-600" : "bg-red-500 text-white",
              )}>
                {deliveryIssueCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {mode === "platform" && (
        <>
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ma-muted)]">
            Brand
          </p>
          <nav className="mb-4 space-y-0.5">
            {BRANDS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => onBrandChange(value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  brand === value
                    ? "bg-white text-[var(--ma-ink)] shadow-sm ring-1 ring-black/5"
                    : "text-[var(--ma-muted)] hover:bg-white/65 hover:text-[var(--ma-ink)]",
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </>
      )}

      <div className="mt-auto">
        {mode === "platform" && (
          <Link
            href="/admin/profilo"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[var(--ma-muted)] transition-colors hover:bg-white/65 hover:text-[var(--ma-ink)]"
          >
            <Settings size={15} />
            Profilo e firma
          </Link>
        )}
        {mode === "tenant" && onOpenDeviceSettings && (
          <button
            type="button"
            onClick={onOpenDeviceSettings}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[var(--ma-muted)] transition-colors hover:bg-white/65 hover:text-[var(--ma-ink)]"
          >
            <Settings size={15} />
            Questo dispositivo
          </button>
        )}
      </div>
    </div>
  );
}
