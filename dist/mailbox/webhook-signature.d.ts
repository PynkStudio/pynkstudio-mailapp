/** Server-only: depends on `node:crypto`. */
export type SignatureHeaders = {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
};
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
export declare function verifySvixSignature(input: {
    secret: string | null | undefined;
    rawBody: string;
    headers: SignatureHeaders;
}): boolean;
//# sourceMappingURL=webhook-signature.d.ts.map