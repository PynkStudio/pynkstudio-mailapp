"use server";
import { createSupabaseAdminClient } from "../server/runtime";
const PAGE_SIZE = 30;
const SENT_DELIVERY_ISSUE_STATUSES = ["delivery_delayed", "bounced", "complained"];
export async function getSentEmails(brand, page = 1, scope, filter) {
    const admin = createSupabaseAdminClient();
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = admin
        .from("sent_emails")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
    if (scope) {
        query = query.eq("tenant_id", scope.tenantId);
    }
    else if (brand === "support") {
        query = query.in("from_address", ["support@menuary.it", "support@bizery.it", "support@weuseorpheo.com"]);
    }
    else if (brand && brand !== "all") {
        query = query.eq("brand", brand);
    }
    if (filter?.onlyDeliveryIssues) {
        query = query.in("status", [...SENT_DELIVERY_ISSUE_STATUSES]);
    }
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    return {
        emails: (data ?? []),
        total: count ?? 0,
        page,
        pageSize: PAGE_SIZE,
    };
}
export async function getSentDeliveryIssueCount(brand, scope) {
    const admin = createSupabaseAdminClient();
    let query = admin
        .from("sent_emails")
        .select("id", { count: "exact", head: true })
        .in("status", [...SENT_DELIVERY_ISSUE_STATUSES]);
    if (scope) {
        query = query.eq("tenant_id", scope.tenantId);
    }
    else if (brand === "support") {
        query = query.in("from_address", ["support@menuary.it", "support@bizery.it", "support@weuseorpheo.com"]);
    }
    else if (brand && brand !== "all") {
        query = query.eq("brand", brand);
    }
    const { count, error } = await query;
    if (error)
        throw new Error(error.message);
    return count ?? 0;
}
export async function getSentEmailById(id) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
        .from("sent_emails")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    return data;
}
//# sourceMappingURL=sent-queries.js.map