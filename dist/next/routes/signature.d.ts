import { NextResponse } from "next/server";
import type { InboundEmailBrand } from "../../email/inbound-types";
/**
 * GET /api/email/signature?brand=menuary|bizery|orpheo
 *
 * Restituisce la firma automatica del brand richiesto, compilata con i dati
 * del profilo siteadmin dell'utente corrente. La firma NON è modificabile dal
 * singolo utente: si personalizza solo modificando il profilo in /admin/profilo.
 */
export declare function GET(request: Request): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    signature: {
        brand: InboundEmailBrand;
        html: string;
        fromName: string;
    };
}>>;
//# sourceMappingURL=signature.d.ts.map