export function parseEmailAddress(value) {
    const trimmed = value.trim();
    const match = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
    if (!match)
        return { name: null, address: trimmed.toLowerCase() };
    const name = match[1]?.trim().replace(/^"|"$/g, "") || null;
    return { name, address: match[2].trim().toLowerCase() };
}
export function activeMailDomain(domains) {
    return domains.find((domain) => !domain.includes("localhost") &&
        !domain.endsWith(".local") &&
        domain !== "127.0.0.1") ?? null;
}
//# sourceMappingURL=index.js.map