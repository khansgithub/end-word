import { NextResponse, type NextRequest } from "next/server";
import {
  isSiteLockEnabled,
  SITE_ACCESS_COOKIE,
  SITE_LOGIN_PATH,
  siteAccessToken,
} from "@/lib/site-lock";

function isPublicPath(pathname: string): boolean {
  if (pathname === SITE_LOGIN_PATH || pathname.startsWith(`${SITE_LOGIN_PATH}/`)) {
    return true;
  }
  if (pathname === "/api/site-auth") {
    return true;
  }
  // Server-side word validation fetches this without the site-access cookie.
  if (pathname.startsWith("/api/dictionary")) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  if (!isSiteLockEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const expected = await siteAccessToken(process.env.SITE_PASSWORD!);
  const token = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  if (token === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Site locked" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = SITE_LOGIN_PATH;
  loginUrl.search = "";
  if (pathname !== "/") {
    loginUrl.searchParams.set("returnTo", pathname + request.nextUrl.search);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
