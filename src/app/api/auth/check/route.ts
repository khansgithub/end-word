import { NextResponse } from "next/server";
import { checkSiteAccess } from "@/lib/site-lock";

export async function GET(request: Request) {
    const authenticated = await checkSiteAccess(request);
    return NextResponse.json({ authenticated });
}
