import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySvixSignature } from "../webhook-signature.js";

const SECRET = `whsec_${Buffer.from("super-secret-value").toString("base64")}`;
const rawBody = JSON.stringify({ type: "email.received" });

function sign(secret: string, id: string, timestamp: string, body: string): string {
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
}

const headers = {
  id: "msg_1",
  timestamp: "1750000000",
  signature: sign(SECRET, "msg_1", "1750000000", rawBody),
};

describe("verifySvixSignature", () => {
  it("accepts a correct signature", () => {
    expect(verifySvixSignature({ secret: SECRET, rawBody, headers })).toBe(true);
  });

  it("accepts when one of several signatures matches", () => {
    const multi = { ...headers, signature: `v1,AAAA ${headers.signature}` };
    expect(verifySvixSignature({ secret: SECRET, rawBody, headers: multi })).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifySvixSignature({ secret: SECRET, rawBody: `${rawBody} `, headers })).toBe(false);
  });

  it("rejects a mismatched timestamp", () => {
    expect(
      verifySvixSignature({ secret: SECRET, rawBody, headers: { ...headers, timestamp: "1750000001" } }),
    ).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const other = `whsec_${Buffer.from("another-secret").toString("base64")}`;
    expect(verifySvixSignature({ secret: other, rawBody, headers })).toBe(false);
  });

  it("fails closed when the secret is set but headers are missing", () => {
    expect(
      verifySvixSignature({ secret: SECRET, rawBody, headers: { id: null, timestamp: null, signature: null } }),
    ).toBe(false);
  });

  it("skips verification when no secret is configured", () => {
    expect(
      verifySvixSignature({ secret: undefined, rawBody, headers: { id: null, timestamp: null, signature: null } }),
    ).toBe(true);
  });
});
