"use server";
import { createSupabaseAdminClient } from "../server/runtime";
/** Tutti gli eventi per un singolo resend_email_id (usato nel dettaglio email inviata). */
export async function getTrackingEventsForEmail(resendEmailId) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
        .from("email_tracking_events")
        .select("*")
        .eq("resend_email_id", resendEmailId)
        .order("created_at", { ascending: true });
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
export async function getTrackingSummariesForEmails(resendEmailIds) {
    if (resendEmailIds.length === 0)
        return {};
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
        .from("email_tracking_events")
        .select("resend_email_id, event_type, created_at, metadata")
        .in("resend_email_id", resendEmailIds)
        .in("event_type", ["email.opened", "email.clicked"])
        .order("created_at", { ascending: true });
    if (error)
        throw new Error(error.message);
    const map = {};
    for (const row of (data ?? [])) {
        const id = row.resend_email_id;
        if (!map[id])
            map[id] = { openCount: 0, clickCount: 0, firstOpenedAt: null, lastClickedUrl: null };
        const s = map[id];
        if (row.event_type === "email.opened") {
            s.openCount++;
            if (!s.firstOpenedAt)
                s.firstOpenedAt = row.created_at;
        }
        else if (row.event_type === "email.clicked") {
            s.clickCount++;
            const meta = row.metadata;
            const click = meta.click;
            if (click?.link)
                s.lastClickedUrl = String(click.link);
        }
    }
    return map;
}
//# sourceMappingURL=tracking-queries.js.map