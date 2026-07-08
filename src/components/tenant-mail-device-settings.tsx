"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, ShieldCheck, X } from "lucide-react";
import { cn } from "../utils";
import { getDeviceId } from "../push/device-id";
import { usePushSubscription } from "../push/use-push-subscription";
import { getMailDeviceFilter, setMailDeviceFilter, clearMailDeviceFilter, type MailDeviceFilter } from "../email/mail-device-filters";

const GESTIONE_SW_PATH = "/gestione-sw.js";

type Props = {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  /** Notifica il genitore quando il filtro locale cambia, per aggiornare la vista "Le mie". */
  onFilterChange: (filter: MailDeviceFilter | null) => void;
};

export function TenantMailDeviceSettings({ open, tenantId, onClose, onFilterChange }: Props) {
  const push = usePushSubscription({ swPath: GESTIONE_SW_PATH, target: { scope: "tenant", tenantId } });
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [localPartsRaw, setLocalPartsRaw] = useState("");
  const [savedFilter, setSavedFilter] = useState<MailDeviceFilter | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const deviceId = getDeviceId();
    getMailDeviceFilter(tenantId, deviceId)
      .then((filter) => {
        if (cancelled) return;
        setSavedFilter(filter);
        setLabel(filter?.label ?? "");
        setLocalPartsRaw(filter?.localParts.join(", ") ?? "");
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, tenantId]);

  function handleSave() {
    startTransition(async () => {
      const deviceId = getDeviceId();
      const filter = await setMailDeviceFilter(tenantId, deviceId, localPartsRaw, label);
      setSavedFilter(filter);
      onFilterChange(filter.localParts.length > 0 ? filter : null);
    });
  }

  function handleClear() {
    startTransition(async () => {
      const deviceId = getDeviceId();
      await clearMailDeviceFilter(tenantId, deviceId);
      setSavedFilter(null);
      setLabel("");
      setLocalPartsRaw("");
      onFilterChange(null);
    });
  }

  const enabled = push.status === "granted";
  const blocked = push.status === "denied";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--ma-line)] px-5 py-4">
          <h2 className="font-semibold text-[var(--ma-ink)]">Questo dispositivo</h2>
          <button onClick={onClose} className="menuary-admin-nav-link !w-auto !px-2 !py-1.5" aria-label="Chiudi">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-[var(--ma-ink)]">Notifiche push</p>
            <p className="mb-3 text-xs text-[var(--ma-muted)]">
              Attivale per ricevere un avviso su questo dispositivo quando arriva una nuova mail.
            </p>
            {push.status === "unsupported" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ma-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ma-muted)]">
                <BellOff size={13} /> Non supportate su questo browser
              </span>
            ) : enabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                <ShieldCheck size={13} /> Attive su questo dispositivo
              </span>
            ) : blocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ma-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ma-muted)]">
                <BellOff size={13} /> Bloccate dal browser
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void push.enable()}
                disabled={push.status === "working"}
                className="menuary-admin-action-btn inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs"
              >
                <Bell size={13} />
                {push.status === "working" ? "Attivazione…" : "Attiva notifiche"}
              </button>
            )}
            {push.error && <p className="mt-1.5 text-xs text-red-500">{push.error}</p>}
          </div>

          <div className="border-t border-[var(--ma-line)] pt-4">
            <p className="mb-1 text-sm font-semibold text-[var(--ma-ink)]">Filtro avanzato (opzionale)</p>
            <p className="mb-3 text-xs text-[var(--ma-muted)]">
              Di default questo dispositivo riceve la notifica per <strong>ogni</strong> mail del tenant.
              Per assegnargli solo alcune caselle (es. <em>fatturazione</em>, <em>recruiting</em>), indica qui
              le parti locali degli indirizzi (prima della @, separate da virgola): il dispositivo avrà anche
              una vista &laquo;Le mie&raquo; con solo quelle mail.
            </p>

            {loading ? (
              <p className="text-xs text-[var(--ma-muted)]">Caricamento…</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--ma-muted)]">Nome dispositivo (opzionale)</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Es. Reception, Ufficio personale…"
                    className="menuary-admin-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--ma-muted)]">Local part (separate da virgola)</label>
                  <textarea
                    value={localPartsRaw}
                    onChange={(e) => setLocalPartsRaw(e.target.value)}
                    placeholder="Es. fatturazione, prenotazioni"
                    rows={2}
                    className="menuary-admin-input w-full text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="menuary-admin-action-btn !px-3 !py-1.5 text-xs"
                  >
                    Salva
                  </button>
                  {savedFilter && savedFilter.localParts.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={isPending}
                      className={cn("menuary-admin-nav-link !w-auto !px-3 !py-1.5 text-xs text-red-500")}
                    >
                      Rimuovi filtro
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
