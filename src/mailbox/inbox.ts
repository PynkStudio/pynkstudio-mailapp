/**
 * Mailbox listing: view filters, pagination, counts and search.
 *
 * When a search term is present the rows are scanned up to
 * `config.searchResultLimit` and filtered in memory, because the haystack spans
 * the rendered date formats and the stripped HTML body — neither of which
 * PostgREST can filter on.
 */

import type { MailboxConfig } from "./config.js";
import type { InboundMailRow, MailboxDb } from "./db.js";
import {
  attachThreadMessages,
  hydrateInboundAssignments,
  hydrateMissingInboundBodies,
  type ThreadMailMessage,
} from "./hydration.js";
import { matchesMailSearch, pageMessages } from "./search.js";

export type MailboxView = "inbox" | "unread" | "starred" | "archived" | "spam" | "sent";

export function parseMailboxView(value: string | null | undefined): MailboxView {
  return value === "unread" ||
    value === "starred" ||
    value === "archived" ||
    value === "spam" ||
    value === "sent"
    ? value
    : "inbox";
}

export function parseMailboxPage(value: string | null | undefined): number {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : 1;
}

export type MailboxPayload = {
  view: MailboxView;
  page: number;
  pageSize: number;
  messages: ThreadMailMessage[];
  total: number;
  counts: { inbox: number; unread: number; sent?: number };
  fromOptions: readonly MailboxConfig["fromOptions"][number][];
};

export type LoadMailboxInput = {
  view: MailboxView;
  page: number;
  search?: string;
  /** Resend key, used only to backfill bodies of legacy rows. */
  resendApiKey?: string;
};

export async function loadMailbox(
  db: MailboxDb,
  config: MailboxConfig,
  input: LoadMailboxInput,
): Promise<MailboxPayload> {
  const { view, page } = input;
  const search = (input.search ?? "").trim();
  const isSearching = search.length > 0;
  const pageSize = config.pageSize;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const rangeStart = isSearching ? 0 : from;
  const rangeEnd = isSearching ? config.searchResultLimit - 1 : to;

  const unreadCount = () =>
    db
      .from(config.tables.inbound)
      .select("*", { count: "exact", head: true })
      .eq("read", false)
      .eq("archived", false)
      .eq("spam", false);
  const inboxCount = () =>
    db
      .from(config.tables.inbound)
      .select("*", { count: "exact", head: true })
      .eq("archived", false)
      .eq("spam", false);

  if (view === "sent") {
    const [{ data, count, error }, { count: inboxUnread }, { count: inboxTotal }] = await Promise.all([
      db
        .from(config.tables.sent)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(rangeStart, rangeEnd),
      unreadCount(),
      inboxCount(),
    ]);
    if (error) throw error;

    const rows = (data ?? []) as ThreadMailMessage[];
    const filtered = isSearching
      ? rows.filter((message) => matchesMailSearch(message, search, config.searchLocale))
      : rows;
    const pageItems = (isSearching ? pageMessages(filtered, page, pageSize) : filtered).map((message) => ({
      ...message,
      source: "sent" as const,
    }));

    return {
      view,
      page,
      pageSize,
      messages: await attachThreadMessages(db, config, pageItems),
      total: isSearching ? filtered.length : count ?? 0,
      counts: { inbox: inboxTotal ?? 0, unread: inboxUnread ?? 0 },
      fromOptions: config.fromOptions,
    };
  }

  let query = db
    .from(config.tables.inbound)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(rangeStart, rangeEnd);

  if (view === "unread") query = query.eq("read", false).eq("archived", false).eq("spam", false);
  if (view === "starred") query = query.eq("starred", true).eq("spam", false);
  if (view === "archived") query = query.eq("archived", true).eq("spam", false);
  if (view === "spam") query = query.eq("spam", true);
  if (view === "inbox") query = query.eq("archived", false).eq("spam", false);

  const [{ data, count, error }, { count: inboxUnread }, { count: inboxTotal }, { count: sentTotal }] =
    await Promise.all([
      query,
      unreadCount(),
      inboxCount(),
      db.from(config.tables.sent).select("*", { count: "exact", head: true }),
    ]);
  if (error) throw error;

  const hydrated = await hydrateMissingInboundBodies(
    db,
    config,
    (data ?? []) as InboundMailRow[],
    input.resendApiKey,
  );
  const filtered = isSearching
    ? hydrated.filter((message) => matchesMailSearch(message, search, config.searchLocale))
    : hydrated;
  const pageItems = isSearching ? pageMessages(filtered, page, pageSize) : filtered;
  const withAssignees = await hydrateInboundAssignments(db, config, pageItems);

  return {
    view,
    page,
    pageSize,
    messages: await attachThreadMessages(
      db,
      config,
      withAssignees.map((message) => ({ ...(message as unknown as ThreadMailMessage), source: "inbound" as const })),
    ),
    total: isSearching ? filtered.length : count ?? 0,
    counts: { inbox: inboxTotal ?? 0, unread: inboxUnread ?? 0, sent: sentTotal ?? 0 },
    fromOptions: config.fromOptions,
  };
}
