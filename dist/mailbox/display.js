/**
 * Reader-side helpers: collapse quoted replies Apple Mail style, infer a sender
 * name from the signature when the header carries none, and build a preview that
 * excludes the quoted history.
 *
 * Pure and isomorphic — safe to import from the browser.
 */
export function htmlToPlainText(html, fallback) {
    if (fallback?.trim())
        return fallback;
    if (!html)
        return "";
    return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
export function quotedLineDepth(line) {
    const match = line.match(/^\s*((?:>\s*)+)/);
    if (!match)
        return 0;
    return (match[1].match(/>/g) ?? []).length;
}
export function unquoteLine(line, depth) {
    let next = line;
    for (let index = 0; index < depth; index += 1) {
        next = next.replace(/^\s*>\s?/, "");
    }
    return next;
}
export function isQuoteIntro(line) {
    const normalized = line.trim();
    return /\bha scritto:\s*$/i.test(normalized) || /^on .+ wrote:\s*$/i.test(normalized);
}
function quoteSenderFromIntro(line) {
    const withoutEmail = line.replace(/\s*<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const italianPrefix = withoutEmail.replace(/\s+ha scritto:\s*$/i, "");
    if (italianPrefix !== withoutEmail) {
        const timeMatch = italianPrefix.match(/\balle(?: ore)?\s+\d{1,2}[:.]\d{2}\s+(.+)$/i);
        if (timeMatch?.[1]?.trim())
            return timeMatch[1].trim();
        const lastCommaSegment = italianPrefix.split(",").pop()?.trim();
        if (lastCommaSegment)
            return lastCommaSegment;
    }
    const englishPrefix = withoutEmail.replace(/\s+wrote:\s*$/i, "");
    if (englishPrefix !== withoutEmail) {
        const lastCommaSegment = englishPrefix.split(",").pop()?.trim();
        if (lastCommaSegment)
            return lastCommaSegment;
    }
    return null;
}
export function splitQuotedMailText(text) {
    const lines = text.split(/\r?\n/);
    const quoteIntroIndex = lines.findIndex(isQuoteIntro);
    if (quoteIntroIndex >= 0 && quoteIntroIndex < lines.length - 1) {
        return {
            visibleLines: lines.slice(0, quoteIntroIndex),
            quoteIntroLine: lines[quoteIntroIndex],
            quotedLines: lines.slice(quoteIntroIndex + 1),
            quotedSender: quoteSenderFromIntro(lines[quoteIntroIndex]),
        };
    }
    const firstQuotedLine = lines.findIndex((line) => quotedLineDepth(line) > 0);
    if (firstQuotedLine >= 0) {
        return {
            visibleLines: lines.slice(0, firstQuotedLine),
            quoteIntroLine: null,
            quotedLines: lines.slice(firstQuotedLine),
            quotedSender: null,
        };
    }
    return { visibleLines: lines, quoteIntroLine: null, quotedLines: [], quotedSender: null };
}
function isLikelyPersonName(line) {
    const normalized = line.trim();
    if (!normalized || normalized.length > 60)
        return false;
    if (/[<>@•|]|\d/.test(normalized))
        return false;
    if (/\b(ciao|grazie|saluti|buongiorno|buonasera|hello|thanks|regards)\b/i.test(normalized))
        return false;
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4)
        return false;
    return words.every((word) => /^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’-]{1,}$/.test(word));
}
function primaryTextLines(text) {
    if (!text.trim())
        return [];
    return splitQuotedMailText(text).visibleLines.filter((line) => !quotedLineDepth(line));
}
function inferredSenderName(message) {
    const primaryLines = primaryTextLines(htmlToPlainText(message.html_body, message.text_body));
    const signatureBreakIndex = primaryLines.findIndex((line) => !line.trim());
    const candidates = signatureBreakIndex >= 0 ? primaryLines.slice(signatureBreakIndex + 1) : primaryLines.slice(1);
    return candidates.find(isLikelyPersonName)?.trim() ?? null;
}
/** `from_name`, else a name inferred from the signature, else the bare address. */
export function mailDisplaySender(message) {
    return message.from_name?.trim() || inferredSenderName(message) || message.from_address;
}
/** Preview text for the list, excluding any quoted history. */
export function mailPrimaryPreview(message) {
    const primaryLines = primaryTextLines(htmlToPlainText(message.html_body, message.text_body));
    return primaryLines
        .filter((line) => line.trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}
//# sourceMappingURL=display.js.map