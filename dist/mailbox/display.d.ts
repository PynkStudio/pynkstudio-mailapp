/**
 * Reader-side helpers: collapse quoted replies Apple Mail style, infer a sender
 * name from the signature when the header carries none, and build a preview that
 * excludes the quoted history.
 *
 * Pure and isomorphic — safe to import from the browser.
 */
export type MailDisplayMessage = {
    from_address: string;
    from_name: string | null;
    text_body: string | null;
    html_body: string | null;
};
export declare function htmlToPlainText(html: string | null, fallback: string | null): string;
export declare function quotedLineDepth(line: string): number;
export declare function unquoteLine(line: string, depth: number): string;
export declare function isQuoteIntro(line: string): boolean;
export type SplitQuotedMailText = {
    visibleLines: string[];
    quoteIntroLine: string | null;
    quotedLines: string[];
    quotedSender: string | null;
};
export declare function splitQuotedMailText(text: string): SplitQuotedMailText;
/** `from_name`, else a name inferred from the signature, else the bare address. */
export declare function mailDisplaySender(message: MailDisplayMessage): string;
/** Preview text for the list, excluding any quoted history. */
export declare function mailPrimaryPreview(message: MailDisplayMessage): string;
//# sourceMappingURL=display.d.ts.map