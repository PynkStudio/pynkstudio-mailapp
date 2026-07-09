// ─── Payload Resend Inbound ───────────────────────────────────────────────────
// Resend invia questo payload via POST al webhook quando riceve un'email
// sui domini configurati (menuary.it, bizery.it, weuseorpheo.com, pynkstudio.*).
// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Estrae nome e indirizzo da una stringa tipo "Mario Rossi <mario@esempio.it>".
 */
export function parseEmailAddress(raw) {
    const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
    if (match)
        return { name: match[1].trim() || null, address: match[2].trim() };
    return { name: null, address: raw.trim() };
}
/**
 * Determina il brand dalla lista di destinatari.
 * Priorità: orpheo > bizery > menuary > fallback menuary.
 */
export function detectBrandFromRecipients(toAddresses) {
    const addresses = toAddresses.join(" ").toLowerCase();
    if (addresses.includes("@pynkstudio.it") ||
        addresses.includes("@pynkstudio.com") ||
        addresses.includes("@pynkstudio.eu")) {
        return "pynkstudio";
    }
    if (addresses.includes("@weuseorpheo.com"))
        return "orpheo";
    if (addresses.includes("@bizery.it"))
        return "bizery";
    return "menuary";
}
//# sourceMappingURL=inbound-types.js.map