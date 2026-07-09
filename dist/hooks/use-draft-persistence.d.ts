/**
 * Autosave generico su localStorage con debounce.
 * - `key` deve essere unico per tenant/utente/entità (es. `draft:bepork:u123:orari`).
 * - Chiama `saveDraft(v)` dentro ogni `onChange`.
 * - Chiama `clearDraft()` solo dopo conferma 2xx dal server.
 * - Se al mount esiste una bozza recente e non superata dal server, `draftDate` è non-null.
 */
export declare function useDraftPersistence<T>(key: string, options?: {
    /** ISO string dell'ultima modifica server-side; se più recente della bozza, la scarta. */
    serverUpdatedAt?: string;
    /** Giorni prima che la bozza scada automaticamente. Default: 7. */
    expiryDays?: number;
    /** Debounce in ms prima di scrivere su localStorage. Default: 500. */
    debounceMs?: number;
}): {
    draftDate: Date | null;
    saveDraft: (value: T) => void;
    readDraft: () => T | null;
    clearDraft: () => void;
};
//# sourceMappingURL=use-draft-persistence.d.ts.map