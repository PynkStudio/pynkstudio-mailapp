import { describe, expect, it } from "vitest";
import { resolveMailboxConfig } from "../config.js";
import { handleResendWebhookEvent } from "../inbound.js";
import type { MailboxDb } from "../db.js";

const config = resolveMailboxConfig({
  ordinaryDomain: "biteproject.it",
  automaticDomain: "mail.biteproject.it",
  fromOptions: [{ id: "hello", label: "Hello", from: "BITE <hello@biteproject.it>", brand: "bite_ordinary" }],
});

/** Thenable that also exposes `.maybeSingle()`, matching either call style used across the mailbox modules. */
function queryResult(data: unknown) {
  const result = { data, error: null };
  return {
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
    maybeSingle: async () => result,
  };
}

function createMailDbMock() {
  const inserted: Record<string, unknown>[] = [];

  return {
    inserted,
    db: {
      rpc: async () => ({ error: null }),
      from: (table: string) => ({
        select: () => ({
          eq: () => queryResult(table === "user_roles" ? [] : null),
          in: async () => ({ data: [], error: null }),
        }),
        insert: (row: Record<string, unknown>) => {
          inserted.push({ table, ...row });
          return {
            select: () => ({
              maybeSingle: async () => ({ data: { id: "email-1", subject: row.subject }, error: null }),
            }),
          };
        },
      }),
    } as unknown as MailboxDb,
  };
}

describe("handleResendWebhookEvent", () => {
  it("ignores inbound mail addressed to a domain outside this mailbox", async () => {
    const { db, inserted } = createMailDbMock();

    const result = await handleResendWebhookEvent(db, config, {
      type: "email.received",
      data: {
        from: "someone@example.com",
        to: ["hello@a-different-project.it"],
        subject: "Not for us",
      },
    });

    expect(result).toEqual({ kind: "ignored" });
    expect(inserted).toHaveLength(0);
  });

  it("accepts inbound mail addressed to the mailbox's own domain", async () => {
    const { db, inserted } = createMailDbMock();

    const result = await handleResendWebhookEvent(db, config, {
      type: "email.received",
      data: {
        from: "someone@example.com",
        to: ["hello@biteproject.it"],
        subject: "For us",
      },
    });

    expect(result.kind).toBe("received");
    expect(inserted.some((row) => row.table === "inbound_emails")).toBe(true);
  });
});
