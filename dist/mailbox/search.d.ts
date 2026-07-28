/**
 * Server-side mailbox search. Builds a diacritic-insensitive haystack over
 * sender, recipients, subject, body, status and several date renderings, then
 * requires every search term to appear in it.
 *
 * Pure and isomorphic — safe to import from the browser.
 */
export type SearchableMessage = {
    created_at?: unknown;
    from_address?: unknown;
    from_name?: unknown;
    to_addresses?: unknown;
    cc_addresses?: unknown;
    bcc_addresses?: unknown;
    subject?: unknown;
    text_body?: unknown;
    html_body?: unknown;
    status?: unknown;
    [key: string]: unknown;
};
export declare function normalizeSearchText(value: string): string;
/**
 * Renders a timestamp several ways so a user can search by what they see in the
 * list ("12 lug", "12/07/26") and not only by the raw ISO value.
 */
export declare function dateSearchText(value: unknown, locale?: string): string;
export declare function mailSearchHaystack(message: SearchableMessage, locale?: string): string;
/** True when every whitespace-separated term appears in the message haystack. */
export declare function matchesMailSearch(message: SearchableMessage, search: string, locale?: string): boolean;
export declare function pageMessages<T>(messages: T[], page: number, pageSize: number): T[];
//# sourceMappingURL=search.d.ts.map