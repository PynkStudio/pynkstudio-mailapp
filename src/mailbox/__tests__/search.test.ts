import { describe, expect, it } from "vitest";
import { matchesMailSearch, normalizeSearchText, pageMessages } from "../search.js";

const message = {
  created_at: "2026-07-12T15:45:00.000Z",
  from_address: "mario@example.com",
  from_name: "Mario Rossì",
  to_addresses: ["hello@biteproject.it"],
  subject: "Prenotazione barca",
  text_body: "Vorrei informazioni",
  html_body: "<style>p{color:red}</style><p>Vorrei <b>informazioni</b></p>",
  status: "delivered",
};

describe("normalizeSearchText", () => {
  it("strips diacritics and lowercases", () => {
    expect(normalizeSearchText("Rossì È")).toBe("rossi e");
  });
});

describe("matchesMailSearch", () => {
  it("matches an empty query", () => {
    expect(matchesMailSearch(message, "")).toBe(true);
  });

  it("matches on sender, subject and body", () => {
    expect(matchesMailSearch(message, "mario")).toBe(true);
    expect(matchesMailSearch(message, "prenotazione")).toBe(true);
    expect(matchesMailSearch(message, "informazioni")).toBe(true);
  });

  it("ignores diacritics in both query and content", () => {
    expect(matchesMailSearch(message, "rossi")).toBe(true);
    expect(matchesMailSearch(message, "rossì")).toBe(true);
  });

  it("requires every term to match", () => {
    expect(matchesMailSearch(message, "mario prenotazione")).toBe(true);
    expect(matchesMailSearch(message, "mario inesistente")).toBe(false);
  });

  it("searches the stripped HTML body but not its style block", () => {
    expect(matchesMailSearch(message, "informazioni")).toBe(true);
    expect(matchesMailSearch(message, "color")).toBe(false);
  });

  it("matches the rendered date, not only the ISO value", () => {
    expect(matchesMailSearch(message, "12/07/26", "it-IT")).toBe(true);
    expect(matchesMailSearch(message, "2026-07-12")).toBe(true);
  });

  it("matches on delivery status", () => {
    expect(matchesMailSearch(message, "delivered")).toBe(true);
  });
});

describe("pageMessages", () => {
  const items = [1, 2, 3, 4, 5];

  it("slices by page", () => {
    expect(pageMessages(items, 1, 2)).toEqual([1, 2]);
    expect(pageMessages(items, 3, 2)).toEqual([5]);
  });

  it("returns nothing past the end", () => {
    expect(pageMessages(items, 9, 2)).toEqual([]);
  });
});
