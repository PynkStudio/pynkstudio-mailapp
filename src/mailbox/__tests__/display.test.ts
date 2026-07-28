import { describe, expect, it } from "vitest";
import { mailDisplaySender, mailPrimaryPreview, splitQuotedMailText } from "../display.js";

const baseMessage = {
  from_address: "someone@example.com",
  from_name: null,
  html_body: null,
};

describe("mail display helpers", () => {
  it("uses from_name before inferred sender names", () => {
    expect(
      mailDisplaySender({
        ...baseMessage,
        from_name: "Massimo Gmail",
        text_body: "Ciao\n\nMassimo Pernozzoli",
      }),
    ).toBe("Massimo Gmail");
  });

  it("infers a sender name from the new-message signature before falling back to the address", () => {
    expect(
      mailDisplaySender({
        ...baseMessage,
        text_body: "Prova prova\n\nMassimo Pernozzoli\nPerito ed Urbanista\nmpernozzoli@icloud.com",
      }),
    ).toBe("Massimo Pernozzoli");
  });

  it("falls back to the address when no name can be inferred", () => {
    expect(mailDisplaySender({ ...baseMessage, text_body: "ok" })).toBe("someone@example.com");
  });

  it("keeps preview text limited to the new message before quoted replies", () => {
    const text =
      "Prova prova\n\nMassimo Pernozzoli\n\nIl giorno 12 lug 2026, alle ore 15:45, BITE <hello@example.com> ha scritto:\n\nProva";

    expect(mailPrimaryPreview({ ...baseMessage, text_body: text })).toBe("Prova prova Massimo Pernozzoli");
  });

  it("splits quoted email text and extracts the quoted sender", () => {
    const split = splitQuotedMailText(
      "Risposta\n\nIl giorno 12 lug 2026, alle ore 15:45, BITE <hello@example.com> ha scritto:\n\n> Messaggio precedente",
    );

    expect(split.visibleLines.join("\n")).toBe("Risposta\n");
    expect(split.quotedSender).toBe("BITE");
    expect(split.quotedLines.join("\n")).toContain("Messaggio precedente");
  });

  it("splits on a bare quote marker when there is no quote intro line", () => {
    const split = splitQuotedMailText("Nuovo testo\n> vecchio testo");

    expect(split.visibleLines).toEqual(["Nuovo testo"]);
    expect(split.quoteIntroLine).toBeNull();
    expect(split.quotedLines).toEqual(["> vecchio testo"]);
  });

  it("handles English quote intros", () => {
    const split = splitQuotedMailText("Reply\n\nOn 12 Jul 2026, at 15:45, BITE <hello@example.com> wrote:\n\n> before");

    expect(split.quotedSender).toBe("BITE");
  });
});
