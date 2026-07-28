/**
 * Wiring the host provides once, so the route handlers below need no globals.
 *
 * Supabase clients and the push transport are injected rather than constructed
 * here: the package stays free of `@supabase/supabase-js` and `web-push`, and
 * the host keeps control of how credentials are read.
 */
import { sendJson, bearerToken } from "./http.js";
/**
 * Authenticates the caller and checks the admin role, answering 401/403 itself.
 * Returns null when it has already written the response.
 */
export async function requireMailboxAdmin(ctx, req, res) {
    const token = bearerToken(req);
    if (!token) {
        sendJson(res, 401, { error: "unauthenticated" });
        return null;
    }
    const user = await ctx.getUserFromToken(token).catch(() => null);
    if (!user) {
        sendJson(res, 401, { error: "unauthenticated" });
        return null;
    }
    const db = ctx.createServiceClient();
    const { data: isAdmin, error } = await db.rpc(ctx.config.roleCheckRpc, {
        _user_id: user.id,
        _role: ctx.config.adminRole,
    });
    if (error || isAdmin !== true) {
        sendJson(res, 403, { error: "forbidden" });
        return null;
    }
    return { db, user };
}
/** `user_metadata.name`, then `full_name`, then the address. */
export function mailboxUserDisplayName(user) {
    const metaName = user.user_metadata?.name || user.user_metadata?.full_name;
    if (typeof metaName === "string" && metaName.trim())
        return metaName.trim();
    return user.email ?? null;
}
export function resendKeyOf(ctx) {
    return ctx.resendApiKey?.() ?? process.env.RESEND_API_KEY;
}
//# sourceMappingURL=context.js.map