/**
 * Server-side mailbox search. Builds a diacritic-insensitive haystack over
 * sender, recipients, subject, body, status and several date renderings, then
 * requires every search term to appear in it.
 *
 * Pure and isomorphic — safe to import from the browser.
 */
export function normalizeSearchText(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}
function htmlToText(value) {
    if (typeof value !== "string")
        return "";
    return value.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
}
function stringValue(value) {
    if (typeof value === "string")
        return value;
    if (typeof value === "number" || typeof value === "boolean")
        return String(value);
    return "";
}
function arrayText(value) {
    return Array.isArray(value) ? value.map(stringValue).join(" ") : stringValue(value);
}
/**
 * Renders a timestamp several ways so a user can search by what they see in the
 * list ("12 lug", "12/07/26") and not only by the raw ISO value.
 */
export function dateSearchText(value, locale = "it-IT") {
    if (typeof value !== "string")
        return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return [
        value,
        date.toISOString(),
        new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(date),
        new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(date),
        new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date),
    ].join(" ");
}
export function mailSearchHaystack(message, locale = "it-IT") {
    return normalizeSearchText([
        stringValue(message.from_address),
        stringValue(message.from_name),
        arrayText(message.to_addresses),
        arrayText(message.cc_addresses),
        arrayText(message.bcc_addresses),
        stringValue(message.subject),
        stringValue(message.text_body),
        htmlToText(message.html_body),
        stringValue(message.status),
        dateSearchText(message.created_at, locale),
    ].join(" "));
}
/** True when every whitespace-separated term appears in the message haystack. */
export function matchesMailSearch(message, search, locale = "it-IT") {
    const terms = normalizeSearchText(search).split(/\s+/).filter(Boolean);
    if (terms.length === 0)
        return true;
    const haystack = mailSearchHaystack(message, locale);
    return terms.every((term) => haystack.includes(term));
}
export function pageMessages(messages, page, pageSize) {
    const from = (page - 1) * pageSize;
    return messages.slice(from, from + pageSize);
}
//# sourceMappingURL=search.js.map