"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ComposeDrawer, type ComposeAttachment } from "./compose-drawer";
import type { InboundEmailBrand } from "../email/inbound-types";

type OpenOptions = {
  to: string;
  subject?: string;
  brand?: InboundEmailBrand;
  body?: string;
  attachments?: ComposeAttachment[];
};

type LauncherCtx = {
  open: (opts: OpenOptions) => void;
  canCompose: boolean;
};

const Ctx = createContext<LauncherCtx | null>(null);

/** Hook globale per aprire la modale "Nuova mail" da qualsiasi punto del pannello admin. */
export function useMailLauncher(): LauncherCtx {
  return (
    useContext(Ctx) ?? {
      open: ({ to, subject }: OpenOptions) => {
        // Fuori dal provider (es. rendering server o pagine non-admin):
        // ricadiamo sul mailto: nativo per non rompere il flusso.
        const params = subject ? `?subject=${encodeURIComponent(subject)}` : "";
        if (typeof window !== "undefined") {
          window.location.href = `mailto:${to}${params}`;
        }
      },
      canCompose: false,
    }
  );
}

const COMPOSE_ROLES = new Set(["superadmin", "admin", "amministrazione", "venditore"]);

/**
 * Monta una singola istanza di {@link ComposeDrawer} a livello di shell admin
 * ed espone {@link useMailLauncher} per aprirla con un destinatario prefillato.
 */
export function MailLauncherProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen]       = useState(false);
  const [prefill, setPrefill] = useState<OpenOptions>({ to: "" });
  const [canCompose, setCanCompose] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { role?: string } | null) => {
        if (active) setCanCompose(Boolean(d?.role && COMPOSE_ROLES.has(d.role)));
      })
      .catch(() => {
        if (active) setCanCompose(false);
      });
    return () => { active = false; };
  }, []);

  const openCompose = useCallback((opts: OpenOptions) => {
    setPrefill(opts);
    setOpen(true);
  }, []);

  return (
    <Ctx.Provider value={{ open: openCompose, canCompose }}>
      {children}
      <ComposeDrawer
        open={open}
        canCompose={canCompose}
        defaultBrand={prefill.brand ?? "menuary"}
        initialTo={prefill.to}
        initialSubject={prefill.subject}
        initialBody={prefill.body}
        initialAttachments={prefill.attachments}
        onClose={() => setOpen(false)}
        onSent={() => setOpen(false)}
      />
    </Ctx.Provider>
  );
}

/**
 * Link/bottone che apre la modale di scrittura mail con destinatario prefillato.
 * Da usare al posto di `<a href="mailto:…">` in tutte le viste admin.
 */
export function MailLink({
  to,
  subject,
  brand,
  className,
  children,
}: {
  to: string;
  subject?: string;
  brand?: InboundEmailBrand;
  className?: string;
  children: React.ReactNode;
}) {
  const launcher = useMailLauncher();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        launcher.open({ to, subject, brand });
      }}
      className={className}
    >
      {children}
    </button>
  );
}
