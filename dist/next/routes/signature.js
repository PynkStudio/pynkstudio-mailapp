import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../server/runtime";
import { createSupabaseAdminClient } from "../../server/runtime";
import { buildAutoSignature } from "../../email/signature-queries";
/**
 * GET /api/email/signature?brand=menuary|bizery|orpheo
 *
 * Restituisce la firma automatica del brand richiesto, compilata con i dati
 * del profilo siteadmin dell'utente corrente. La firma NON è modificabile dal
 * singolo utente: si personalizza solo modificando il profilo in /admin/profilo.
 */
export async function GET(request) {
    const supabase = await createSupabaseServerClient(".menuary.it");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    const profile = await loadComposerProfile(user.id);
    if (!profile)
        return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    const rawBrand = new URL(request.url).searchParams.get("brand");
    const brand = rawBrand === "bizery" || rawBrand === "orpheo" || rawBrand === "pynkstudio"
        ? rawBrand
        : "menuary";
    const auto = buildAutoSignature(profile, brand);
    return NextResponse.json({
        signature: { brand, html: auto.html, fromName: auto.fromName },
    });
}
// ─── Helper autorizzazione ────────────────────────────────────────────────────
const COMPOSE_ROLES = new Set(["superadmin", "admin", "amministrazione", "venditore"]);
async function loadComposerProfile(userId) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
        .from("siteadmin")
        .select("role, email, display_name, first_name, last_name, phone, work_hours, signature_role")
        .eq("user_id", userId)
        .eq("enabled", true)
        .maybeSingle();
    if (!data || !COMPOSE_ROLES.has(data.role))
        return null;
    return data;
}
//# sourceMappingURL=signature.js.map