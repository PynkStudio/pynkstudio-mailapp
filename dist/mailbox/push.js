/**
 * Web Push delivery for mail notifications.
 *
 * The actual push transport is injected rather than imported, so the package
 * carries no `web-push` dependency and the host stays free to use any sender
 * (or none). The logic worth sharing lives here: resolving subscriptions for a
 * set of profiles, honouring the per-user opt-out, and pruning endpoints the
 * push service has retired.
 */
import { resolveMailPushRevocationProfileIds } from "./assignment.js";
function rejectionStatus(reason) {
    if (typeof reason?.statusCode === "number")
        return reason.statusCode;
    if (typeof reason?.status === "number")
        return reason.status;
    return null;
}
/**
 * Delivers `notification` to every enabled subscription of `profileIds` whose
 * owner has not disabled mail push. Returns true when at least one send landed.
 */
export async function sendMailPushNotification(db, config, send, profileIds, notification, options = {}) {
    const preferenceColumn = options.preferenceColumn ?? "push_mail_enabled";
    const uniqueProfileIds = Array.from(new Set(profileIds.filter(Boolean)));
    if (uniqueProfileIds.length === 0)
        return false;
    const { data, error } = await db
        .from(config.tables.pushSubscriptions)
        .select(`id, profile_id, endpoint, p256dh, auth, enabled, ${config.tables.profiles}!inner(email)`)
        .in("profile_id", uniqueProfileIds)
        .eq("enabled", true);
    if (error)
        throw error;
    const rows = (data ?? []);
    const emailOf = (row) => row.profiles?.email?.trim().toLowerCase();
    const recipientEmails = Array.from(new Set(rows.map(emailOf).filter((value) => Boolean(value))));
    const { data: preferenceRows, error: preferenceError } = recipientEmails.length
        ? await db
            .from(config.tables.notificationPreferences)
            .select(`email, ${preferenceColumn}`)
            .in("email", recipientEmails)
        : { data: [], error: null };
    if (preferenceError)
        throw preferenceError;
    const preferencesByEmail = new Map((preferenceRows ?? []).map((row) => [
        String(row.email).trim().toLowerCase(),
        row,
    ]));
    // Absent preference row means opted in: push is on by default.
    const subscriptions = rows.filter((row) => {
        const email = emailOf(row);
        if (!email)
            return false;
        return preferencesByEmail.get(email)?.[preferenceColumn] ?? true;
    });
    if (subscriptions.length === 0)
        return false;
    const serialized = JSON.stringify(notification);
    const results = await Promise.allSettled(subscriptions.map((subscription) => send({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, serialized)));
    const invalidEndpoints = results
        .map((result, index) => ({ result, subscription: subscriptions[index] }))
        .filter(({ result }) => result.status === "rejected")
        .filter(({ result }) => {
        const status = rejectionStatus(result.reason);
        return status === 404 || status === 410;
    })
        .map(({ subscription }) => subscription.endpoint);
    if (invalidEndpoints.length > 0) {
        await db
            .from(config.tables.pushSubscriptions)
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .in("endpoint", invalidEndpoints);
    }
    return results.some((result) => result.status === "fulfilled");
}
/**
 * Withdraws the notification for a message that has just been read/archived, so
 * other admins are not left holding a stale alert. No-op when nothing was sent.
 */
export async function revokeMailPushNotification(db, config, send, message, options = {}) {
    if (!message.push_notified_at)
        return false;
    const profileIds = await resolveMailPushRevocationProfileIds(db, config, message);
    return sendMailPushNotification(db, config, send, profileIds, { type: "mail-read", closeTag: `mail:${message.id}` }, options);
}
//# sourceMappingURL=push.js.map