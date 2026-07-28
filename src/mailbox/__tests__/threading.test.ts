import { describe, expect, it } from "vitest";
import {
  extractHeaderValue,
  extractMessageIds,
  normalizeHeaders,
  normalizeMessageId,
  normalizeSubjectForThread,
} from "../message-id.js";
import { fallbackThreadKey, generateOutboundMessageId, threadParticipants } from "../threading.js";

describe("normalizeMessageId", () => {
  it("strips angle brackets and lowercases", () => {
    expect(normalizeMessageId("<ABC@Example.com>")).toBe("abc@example.com");
  });

  it("accepts a bare id", () => {
    expect(normalizeMessageId("abc@example.com")).toBe("abc@example.com");
  });

  it("rejects values that are not message ids", () => {
    expect(normalizeMessageId("not-an-id")).toBeNull();
    expect(normalizeMessageId(undefined)).toBeNull();
    expect(normalizeMessageId(42)).toBeNull();
  });
});

describe("extractMessageIds", () => {
  it("pulls every id out of a References header", () => {
    expect(extractMessageIds("<a@x.com> <b@y.com> <a@x.com>")).toEqual(["a@x.com", "b@y.com"]);
  });

  it("falls back to a single bare id", () => {
    expect(extractMessageIds("a@x.com")).toEqual(["a@x.com"]);
  });

  it("returns nothing for junk", () => {
    expect(extractMessageIds("")).toEqual([]);
    expect(extractMessageIds(null)).toEqual([]);
  });
});

describe("normalizeSubjectForThread", () => {
  it("strips stacked reply and forward prefixes", () => {
    expect(normalizeSubjectForThread("Re: Fwd:  RE: Prenotazione")).toBe("prenotazione");
  });

  it("collapses whitespace", () => {
    expect(normalizeSubjectForThread("  Due   spazi ")).toBe("due spazi");
  });
});

describe("normalizeHeaders", () => {
  it("accepts the array form", () => {
    expect(normalizeHeaders([{ name: "To", value: "a@x.com" }])).toEqual([{ name: "To", value: "a@x.com" }]);
  });

  it("accepts the object form", () => {
    expect(normalizeHeaders({ To: "a@x.com" })).toEqual([{ name: "To", value: "a@x.com" }]);
  });

  it("returns an empty list for nothing", () => {
    expect(normalizeHeaders(null)).toEqual([]);
  });
});

describe("extractHeaderValue", () => {
  it("matches case-insensitively", () => {
    expect(extractHeaderValue([{ name: "Message-ID", value: " <a@x.com> " }], "message-id")).toBe("<a@x.com>");
  });

  it("returns null when absent", () => {
    expect(extractHeaderValue([], "message-id")).toBeNull();
  });
});

describe("fallbackThreadKey", () => {
  it("is stable regardless of participant order", () => {
    const a = fallbackThreadKey({ subject: "Ciao", addresses: ["a@x.com", "b@y.com"] });
    const b = fallbackThreadKey({ subject: "Ciao", addresses: ["b@y.com", "a@x.com"] });
    expect(a).toBe(b);
    expect(a.startsWith("fallback:")).toBe(true);
  });

  it("groups a reply with its original by ignoring the Re: prefix", () => {
    const original = fallbackThreadKey({ subject: "Prenotazione", addresses: ["a@x.com"] });
    const reply = fallbackThreadKey({ subject: "Re: Prenotazione", addresses: ["a@x.com"] });
    expect(reply).toBe(original);
  });

  it("separates different participant sets", () => {
    const a = fallbackThreadKey({ subject: "Ciao", addresses: ["a@x.com"] });
    const b = fallbackThreadKey({ subject: "Ciao", addresses: ["c@z.com"] });
    expect(a).not.toBe(b);
  });
});

describe("generateOutboundMessageId", () => {
  it("builds a unique id on the given domain", () => {
    const first = generateOutboundMessageId("example.com");
    const second = generateOutboundMessageId("example.com");
    expect(first.endsWith("@example.com")).toBe(true);
    expect(first).not.toBe(second);
  });
});

describe("threadParticipants", () => {
  it("collects sender and every recipient field, dropping empties", () => {
    expect(
      threadParticipants({
        from_address: "a@x.com",
        to_addresses: ["b@y.com"],
        cc_addresses: ["c@z.com"],
        bcc_addresses: null,
      }),
    ).toEqual(["a@x.com", "b@y.com", "c@z.com"]);
  });
});
