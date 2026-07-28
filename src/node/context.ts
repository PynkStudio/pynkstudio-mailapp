/**
 * Wiring the host provides once, so the route handlers below need no globals.
 *
 * Supabase clients and the push transport are injected rather than constructed
 * here: the package stays free of `@supabase/supabase-js` and `web-push`, and
 * the host keeps control of how credentials are read.
 */

import type { MailboxConfig } from "../mailbox/config.js";
import type { MailboxDb } from "../mailbox/db.js";
import type { MailPushOptions, PushSender } from "../mailbox/push.js";
import { sendJson, bearerToken, type MailboxNodeRequest, type MailboxNodeResponse } from "./http.js";

export type MailboxUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type MailboxNodeContext = {
  config: MailboxConfig;
  /** Service-role client; must bypass RLS. */
  createServiceClient: () => MailboxDb;
  /** Resolves a bearer token to a user, or null when invalid. */
  getUserFromToken: (token: string) => Promise<MailboxUser | null>;
  resendApiKey?: () => string | undefined;
  /** Svix/Resend webhook secret. Omit to accept unsigned payloads. */
  webhookSecret?: () => string | undefined;
  /** Shared secret allowing an authenticated internal test to skip signature checks. */
  internalTestSecret?: () => string | undefined;
  push?: {
    send: PushSender;
    options?: MailPushOptions;
    /** Notification title; receives whether the message was routed to one admin. */
    title?: (assigned: boolean) => string;
  };
};

export type AuthenticatedMailboxAdmin = {
  db: MailboxDb;
  user: MailboxUser;
};

/**
 * Authenticates the caller and checks the admin role, answering 401/403 itself.
 * Returns null when it has already written the response.
 */
export async function requireMailboxAdmin(
  ctx: MailboxNodeContext,
  req: MailboxNodeRequest,
  res: MailboxNodeResponse,
): Promise<AuthenticatedMailboxAdmin | null> {
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
export function mailboxUserDisplayName(user: MailboxUser): string | null {
  const metaName = user.user_metadata?.name || user.user_metadata?.full_name;
  if (typeof metaName === "string" && metaName.trim()) return metaName.trim();
  return user.email ?? null;
}

export function resendKeyOf(ctx: MailboxNodeContext): string | undefined {
  return ctx.resendApiKey?.() ?? process.env.RESEND_API_KEY;
}
