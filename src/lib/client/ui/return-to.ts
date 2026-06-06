const RETURN_TO_PARAM = "returnTo";

/** Allowed post-login destinations (open redirect guard). */
const ALLOWED_PREFIXES = ["/lobby", "/room/"] as const;

export function buildLoginUrl(returnPath: string): string {
  const safe = sanitizeReturnTo(returnPath);
  if (!safe) return "/";
  return `/?${RETURN_TO_PARAM}=${encodeURIComponent(safe)}`;
}

export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const path = value.startsWith("/") ? value : `/${value}`;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  const allowed = ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
  return allowed ? path : null;
}

export function returnToFromSearchParams(
  params: Pick<URLSearchParams, "get">
): string | null {
  return sanitizeReturnTo(params.get(RETURN_TO_PARAM));
}
