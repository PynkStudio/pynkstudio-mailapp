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
export {};
//# sourceMappingURL=db.js.map