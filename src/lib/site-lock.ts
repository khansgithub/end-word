import { envGet } from "@/app/server/env";

import { SITE_ACCESS_COOKIE } from "@/shared/site-lock";

/** SHA-256 hex digest used as the cookie value (no plaintext password in cookies). */
export async function siteAccessToken(password: string): Promise<string> {
    const data = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export function isSiteLockEnabled(): boolean {
    const password = envGet("SITE_PASSWORD");
    return typeof password === "string" && password.length > 0;
}

/** Check whether a given incoming Request carries a valid site-access cookie. */
export async function checkSiteAccess(request: Request): Promise<boolean> {
    if (!isSiteLockEnabled()) return true;
    const expected = await siteAccessToken(envGet("SITE_PASSWORD")!);
    const cookieHeader = request.headers.get("cookie") ?? "";
    const token = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${SITE_ACCESS_COOKIE}=`))
        ?.slice(SITE_ACCESS_COOKIE.length + 1);
    return token === expected;
}
