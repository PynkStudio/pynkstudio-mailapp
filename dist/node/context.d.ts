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
import { type MailboxNodeRequest, type MailboxNodeResponse } from "./http.js";
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
export declare function requireMailboxAdmin(ctx: MailboxNodeContext, req: MailboxNodeRequest, res: MailboxNodeResponse): Promise<AuthenticatedMailboxAdmin | null>;
/** `user_metadata.name`, then `full_name`, then the address. */
export declare function mailboxUserDisplayName(user: MailboxUser): string | null;
export declare function resendKeyOf(ctx: MailboxNodeContext): string | undefined;
//# sourceMappingURL=context.d.ts.map