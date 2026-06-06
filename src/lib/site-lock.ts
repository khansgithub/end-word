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
