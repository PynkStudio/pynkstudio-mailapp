"use client";
import { useCallback, useEffect, useRef, useState } from "react";
/**
 * Autosave generico su localStorage con debounce.
 * - `key` deve essere unico per tenant/utente/entità (es. `draft:bepork:u123:orari`).
 * - Chiama `saveDraft(v)` dentro ogni `onChange`.
 * - Chiama `clearDraft()` solo dopo conferma 2xx dal server.
 * - Se al mount esiste una bozza recente e non superata dal server, `draftDate` è non-null.
 */
export function useDraftPersistence(key, options) {
    const { serverUpdatedAt, expiryDays = 7, debounceMs = 500 } = options ?? {};
    const [draftDate, setDraftDate] = useState(null);
    const debounceRef = useRef(null);
    const pendingRef = useRef(undefined);
    useEffect(() => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw)
                return;
            const meta = JSON.parse(raw);
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
        }
        catch {
            localStorage.removeItem(key);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    const saveDraft = useCallback((value) => {
        pendingRef.current = value;
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            try {
                const meta = {
                    value: pendingRef.current,
                    savedAt: Date.now(),
                    serverUpdatedAt,
                };
                localStorage.setItem(key, JSON.stringify(meta));
            }
            catch {
                // localStorage pieno o non disponibile
            }
        }, debounceMs);
    }, 
    // serverUpdatedAt è stabile per render cycle; debounceMs e key raramente cambiano
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, debounceMs, serverUpdatedAt]);
    const readDraft = useCallback(() => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw)
                return null;
            return JSON.parse(raw).value;
        }
        catch {
            return null;
        }
    }, [key]);
    const clearDraft = useCallback(() => {
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        localStorage.removeItem(key);
        setDraftDate(null);
    }, [key]);
    return { draftDate, saveDraft, readDraft, clearDraft };
}
//# sourceMappingURL=use-draft-persistence.js.map