import { NextResponse } from "next/server";
export declare function POST(request: Request): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    ok: boolean;
    messageId: string;
}>>;
//# sourceMappingURL=send.d.ts.map