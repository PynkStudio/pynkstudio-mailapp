/**
 * Minimal structural type for the Supabase client the mailbox modules need.
 *
 * Deliberately loose: PostgREST splits its fluent API across several builder
 * classes (`PostgrestQueryBuilder` has `insert`/`update`, only the builder
 * returned by `select()` has `eq`/`or`/`order`), so a strict structural type
 * would reject a real `SupabaseClient` instead of accepting it. Keeping the
 * builder untyped means the package needs no `@supabase/supabase-js` dependency
 * and stays compatible across client majors — the same convention already used
 * by `MailappRuntime` in `src/server/runtime.ts`.
 */
export type MailboxQueryResult<T = any> = {
    data: T;
    error: any;
    count?: number | null;
};
export type MailboxDb = {
    from: (table: string) => any;
    rpc: (name: string, params?: Record<string, unknown>) => any;
};
/** A row in the inbound table, as far as the mailbox modules care. */
export type InboundMailRow = {
    id: string;
    created_at?: string;
    message_id?: string | null;
    resend_email_id?: string | null;
    thread_key?: string | null;
    in_reply_to?: string | null;
    references?: string[] | null;
    from_address?: string | null;
    from_name?: string | null;
    to_addresses?: string[] | null;
    subject?: string | null;
    text_body?: string | null;
    html_body?: string | null;
    headers?: unknown;
    attachments?: unknown;
    assigned_to_profile_id?: string | null;
    assignment_reason?: string | null;
    push_notified_at?: string | null;
    [key: string]: unknown;
};
export type MailProfileRow = {
    id: string;
    name: string | null;
    email: string;
};
//# sourceMappingURL=db.d.ts.map