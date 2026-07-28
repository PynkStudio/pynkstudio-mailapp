/**
 * RFC 5322 `Message-ID` / `In-Reply-To` / `References` normalization, plus
 * subject normalization for threading fallbacks.
 *
 * Pure and isomorphic — safe to import from the browser.
 */
export type MailHeader = {
    name: string;
    value: string;
};
export declare function cleanMessageId(value: string): string;
/** Extracts a single bare message id, or null when the value carries none. */
export declare function normalizeMessageId(value: unknown): string | null;
export declare function extractHeaderValue(headers: MailHeader[] | null | undefined, name: string): string | null;
/** Extracts every bare message id from a `References`-style header value. */
export declare function extractMessageIds(value: unknown): string[];
/** Strips reply/forward prefixes so replies land in the same fallback thread. */
export declare function normalizeSubjectForThread(subject: string): string;
/** Normalizes Resend's header payload, which may be an array or an object. */
export declare function normalizeHeaders(raw: unknown): MailHeader[];
export declare function asStringArray(value: unknown): string[];
//# sourceMappingURL=message-id.d.ts.map