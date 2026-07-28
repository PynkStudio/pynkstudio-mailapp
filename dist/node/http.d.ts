/**
 * Minimal (req, res) helpers for hand-rolled Node/Vercel functions.
 *
 * Structurally compatible with `@vercel/node`'s types without depending on them,
 * so a host that already has its own `NodeRequest`/`NodeResponse` shape can pass
 * its objects straight through.
 */
export interface MailboxNodeRequest {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    url?: string;
    on?(event: string, listener: (chunk: unknown) => void): void;
    body?: unknown;
}
export interface MailboxNodeResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(body?: string | Uint8Array): void;
}
export declare function sendJson(res: MailboxNodeResponse, status: number, payload: unknown): void;
export declare function methodNotAllowed(res: MailboxNodeResponse): void;
/** Reads the body as raw text, tolerating a pre-parsed `req.body`. */
export declare function readRawBody(req: MailboxNodeRequest): Promise<string>;
export declare function readJsonBody<T = Record<string, unknown>>(req: MailboxNodeRequest): Promise<T>;
export declare function bearerToken(req: MailboxNodeRequest): string | null;
export declare function firstHeader(req: MailboxNodeRequest, name: string): string | null;
export declare function firstQueryParam(req: MailboxNodeRequest, key: string): string | null;
//# sourceMappingURL=http.d.ts.map