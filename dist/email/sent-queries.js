"use server";
import { createSupabaseAdminClient } from "../server/runtime";
const PAGE_SIZE = 30;
export async function getSentEmails(brand, page = 1, scope) {
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