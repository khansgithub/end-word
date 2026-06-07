import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isSiteLockEnabled, siteAccessToken } from "@/lib/site-lock";
import { SITE_ACCESS_COOKIE } from "@/shared/site-lock";
import { envGet } from "@/app/server/env";

function passwordsMatch(input: string, expected: string): boolean {
    const a = Buffer.from(input);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
    if (!isSiteLockEnabled()) {
        return NextResponse.json({ ok: true });
    }

    let password = "";
    try {
        const body = (await request.json()) as { password?: string };
        password = String(body.password ?? "");
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const expected = envGet("SITE_PASSWORD")!;
    if (!passwordsMatch(password, expected)) {
        return NextResponse.json(
            { error: "Invalid password" },
            { status: 401 },
        );
    }

    const token = await siteAccessToken(expected);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SITE_ACCESS_COOKIE, token, {
        httpOnly: true,
        secure: envGet("NODE_ENV") === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
    });
    return response;
}
