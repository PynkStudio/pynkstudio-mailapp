/**
 * Minimal (req, res) helpers for hand-rolled Node/Vercel functions.
 *
 * Structurally compatible with `@vercel/node`'s types without depending on them,
 * so a host that already has its own `NodeRequest`/`NodeResponse` shape can pass
 * its objects straight through.
 */
export function sendJson(res, status, payload) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(payload));
}
export function methodNotAllowed(res) {
    sendJson(res, 405, { error: "method_not_allowed" });
}
/** Reads the body as raw text, tolerating a pre-parsed `req.body`. */
export function readRawBody(req) {
    if (typeof req.body === "string")
        return Promise.resolve(req.body);
    if (req.body && typeof req.body === "object")
        return Promise.resolve(JSON.stringify(req.body));
    if (typeof req.on !== "function")
        return Promise.resolve("");
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => {
            data += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
        });
        req.on("end", () => resolve(data));
        req.on("error", (err) => reject(err));
    });
}
export async function readJsonBody(req) {
    if (req.body && typeof req.body === "object")
        return req.body;
    if (typeof req.body === "string" && req.body.length > 0)
        return JSON.parse(req.body);
    const raw = await readRawBody(req);
    return raw ? JSON.parse(raw) : {};
}
export function bearerToken(req) {
    const header = req.headers["authorization"] ?? req.headers["Authorization"];
    const value = Array.isArray(header) ? header[0] : header;
    if (!value)
        return null;
    const match = /^Bearer\s+(.+)$/i.exec(value);
    return match ? match[1].trim() : null;
}
export function firstHeader(req, name) {
    const direct = req.headers[name] ?? req.headers[name.toLowerCase()] ?? req.headers[name.toUpperCase()];
    const value = Array.isArray(direct) ? direct[0] : direct;
    return value ?? null;
}
export function firstQueryParam(req, key) {
    if (!req.url)
        return null;
    try {
        return new URL(req.url, "http://localhost").searchParams.get(key);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=http.js.map