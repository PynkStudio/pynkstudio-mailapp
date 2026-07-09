"use server";
import { createSupabaseAdminClient } from "../server/runtime";
/** Ritorna tutti gli utenti siteadmin attivi per il pannello di assegnazione email. */
export async function getSiteadminForAssignment() {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
        .from("siteadmin")
        .select("id, email, first_name, last_name, display_name, role")
        .eq("enabled", true)
        .order("first_name", { nullsFirst: false });
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
//# sourceMappingURL=assignment-queries.js.map