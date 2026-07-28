/**
 * Mailbox listing: view filters, pagination, counts and search.
 *
 * When a search term is present the rows are scanned up to
 * `config.searchResultLimit` and filtered in memory, because the haystack spans
 * the rendered date formats and the stripped HTML body — neither of which
 * PostgREST can filter on.
 */
import type { MailboxConfig } from "./config.js";
import type { MailboxDb } from "./db.js";
import { type ThreadMailMessage } from "./hydration.js";
export type MailboxView = "inbox" | "unread" | "starred" | "archived" | "spam" | "sent";
export declare function parseMailboxView(value: string | null | undefined): MailboxView;
export declare function parseMailboxPage(value: string | null | undefined): number;
export type MailboxPayload = {
    view: MailboxView;
    page: number;
    pageSize: number;
    messages: ThreadMailMessage[];
    total: number;
    counts: {
        inbox: number;
        unread: number;
        sent?: number;
    };
    fromOptions: readonly MailboxConfig["fromOptions"][number][];
};
export type LoadMailboxInput = {
    view: MailboxView;
    page: number;
    search?: string;
    /** Resend key, used only to backfill bodies of legacy rows. */
    resendApiKey?: string;
};
export declare function loadMailbox(db: MailboxDb, config: MailboxConfig, input: LoadMailboxInput): Promise<MailboxPayload>;
//# sourceMappingURL=inbox.d.ts.map