/**
 * RFC 5322 `Message-ID` / `In-Reply-To` / `References` normalization, plus
 * subject normalization for threading fallbacks.
 *
 * Pure and isomorphic — safe to import from the browser.
 */
export function cleanMessageId(value) {
    return value.trim().replace(/^<+/, "").replace(/>+$/, "").toLowerCase();
}
/** Extracts a single bare message id, or null when the value carries none. */
export function normalizeMessageId(value) {
    if (typeof value !== "string")
        return null;
    const match = value.match(/<([^<>@\s]+@[^<>\s]+)>/);
    const id = cleanMessageId(match?.[1] ?? value);
    return id.includes("@") ? id : null;
}
export function extractHeaderValue(headers, name) {
    const header = headers?.find((item) => item.name.toLowerCase() === name.toLowerCase());
    return header?.value?.trim() || null;
}
/** Extracts every bare message id from a `References`-style header value. */
export function extractMessageIds(value) {
    if (typeof value !== "string")
        return [];
    const bracketed = Array.from(value.matchAll(/<([^<>@\s]+@[^<>\s]+)>/g))
        .map((match) => normalizeMessageId(match[1]))
        .filter((id) => Boolean(id));
    if (bracketed.length > 0)
        return Array.from(new Set(bracketed));
    const single = normalizeMessageId(value);
    return single ? [single] : [];
}
/** Strips reply/forward prefixes so replies land in the same fallback thread. */
export function normalizeSubjectForThread(subject) {
    return subject
        .replace(/^\s*((re|fw|fwd|rif|i)\s*:\s*)+/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}
/** Normalizes Resend's header payload, which may be an array or an object. */
export function normalizeHeaders(raw) {
    if (!raw)
        return [];
    if (Array.isArray(raw)) {
        return raw
            .map((item) => item && typeof item === "object"
            ? {
                name: String(item.name ?? ""),
                value: String(item.value ?? ""),
            }
            : null)
            .filter((item) => Boolean(item));
    }
    if (typeof raw === "object") {
        return Object.entries(raw).map(([name, value]) => ({
            name,
            value: String(value ?? ""),
        }));
    }
    return [];
}
export function asStringArray(value) {
    if (Array.isArray(value))
        return value.map(String).filter(Boolean);
    if (typeof value === "string" && value.trim())
        return [value.trim()];
    return [];
}
//# sourceMappingURL=message-id.js.map