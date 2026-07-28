import { createHmac, timingSafeEqual } from "node:crypto";
/**
 * Verifies a Svix-style webhook signature (the scheme Resend uses).
 *
 * The signed content is `<id>.<timestamp>.<rawBody>`, HMAC-SHA256 with the
 * base64-decoded secret. The header may carry several space-separated
 * `v1,<sig>` values; any match passes. Comparison is constant-time.
 *
 * Returns false when a secret is configured but the headers are absent, so a
 * caller that has opted into verification cannot be bypassed by omitting them.
 */
export function verifySvixSignature(input) {
    const { secret, rawBody, headers } = input;
    if (!secret)
        return true;
    if (!headers.id || !headers.timestamp || !headers.signature)
        return false;
    try {
        const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
        const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
        const computed = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
        return headers.signature
            .split(" ")
            .map((sig) => sig.replace(/^v1,/, ""))
            .some((sig) => {
            try {
                return timingSafeEqual(Buffer.from(sig, "base64"), Buffer.from(computed, "base64"));
            }
            catch {
                return false;
            }
        });
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=webhook-signature.js.map