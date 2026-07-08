"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DraftMeta<T> = {
  value: T;
  savedAt: number;
  serverUpdatedAt?: string;
};

/**
 * Autosave generico su localStorage con debounce.
 * - `key` deve essere unico per tenant/utente/entità (es. `draft:bepork:u123:orari`).
 * - Chiama `saveDraft(v)` dentro ogni `onChange`.
 * - Chiama `clearDraft()` solo dopo conferma 2xx dal server.
 * - Se al mount esiste una bozza recente e non superata dal server, `draftDate` è non-null.
 */
export function useDraftPersistence<T>(
  key: string,
  options?: {
    /** ISO string dell'ultima modifica server-side; se più recente della bozza, la scarta. */
    serverUpdatedAt?: string;
    /** Giorni prima che la bozza scada automaticamente. Default: 7. */
    expiryDays?: number;
    /** Debounce in ms prima di scrivere su localStorage. Default: 500. */
    debounceMs?: number;
  },
) {
  const { serverUpdatedAt, expiryDays = 7, debounceMs = 500 } = options ?? {};

  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const meta = JSON.parse(raw) as DraftMeta<T>;

      if (Date.now() - meta.savedAt > expiryDays * 86_400_000) {
        localStorage.removeItem(key);
        return;
      }

      if (serverUpdatedAt && meta.serverUpdatedAt) {
        if (new Date(serverUpdatedAt).getTime() > meta.savedAt) {
          localStorage.removeItem(key);
          return;
        }
      }

      setDraftDate(new Date(meta.savedAt));
    } catch {
      localStorage.removeItem(key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const saveDraft = useCallback(
    (value: T) => {
      pendingRef.current = value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          const meta: DraftMeta<T> = {
            value: pendingRef.current as T,
            savedAt: Date.now(),
            serverUpdatedAt,
          };
          localStorage.setItem(key, JSON.stringify(meta));
        } catch {
          // localStorage pieno o non disponibile
        }
      }, debounceMs);
    },
    // serverUpdatedAt è stabile per render cycle; debounceMs e key raramente cambiano
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, debounceMs, serverUpdatedAt],
  );

  const readDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return (JSON.parse(raw) as DraftMeta<T>).value;
    } catch {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    localStorage.removeItem(key);
    setDraftDate(null);
  }, [key]);

  return { draftDate, saveDraft, readDraft, clearDraft };
}
