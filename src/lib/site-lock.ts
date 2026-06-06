/** Shared cookie name for temporary site-wide password lock. */
export const SITE_ACCESS_COOKIE = "end-word-site-access";

export const SITE_LOGIN_PATH = "/site-login";

/** SHA-256 hex digest used as the cookie value (no plaintext password in cookies). */
export async function siteAccessToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isSiteLockEnabled(): boolean {
  const password = process.env.SITE_PASSWORD;
  return typeof password === "string" && password.length > 0;
}

/** Check whether a given incoming Request carries a valid site-access cookie. */
export async function checkSiteAccess(request: Request): Promise<boolean> {
  if (!isSiteLockEnabled()) return true;
  const expected = await siteAccessToken(process.env.SITE_PASSWORD!);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SITE_ACCESS_COOKIE}=`))
    ?.slice(SITE_ACCESS_COOKIE.length + 1);
  return token === expected;
}
