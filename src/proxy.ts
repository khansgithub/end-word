import { NextResponse, type NextRequest } from "next/server";
import {
    isSiteLockEnabled,
    siteAccessToken,
} from "@/lib/site-lock";
import {
    SITE_ACCESS_COOKIE,
    SITE_LOGIN_PATH,
    roomAccessCookie,
} from "@/shared/site-lock";
import { envGet } from "./app/server/env";
import { logger } from "@/app/server/logging";

function isAuthPath(pathname: string): boolean {
    if (
        pathname === SITE_LOGIN_PATH ||
        pathname.startsWith(`${SITE_LOGIN_PATH}/`)
    ) {
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

/** Paths that bypass the site lock so invitees can reach a running room. */
function isRoomInvitePath(pathname: string, method: string): boolean {
	// Room page (direct invite link)
	if (pathname.startsWith("/room/")) return true;
	// Home page (name entry for invite flow — the client redirects here when playerName is empty)
	if (pathname === "/") return true;
	// Join API
	if (pathname === "/api/rooms/join") return true;
	// Get room info (GET /api/rooms/{roomId})
	if (method === "GET" && /^\/api\/rooms\/[^/]+$/.test(pathname)) return true;
	// Spectate — route handler does its own auth via getSessionUser(),
	// and no room-access cookie exists yet (it's set on success).
	if (/^\/api\/rooms\/[^/]+\/spectate$/.test(pathname)) return true;
	return false;
}

/** Extract roomId from room action paths like /api/rooms/{roomId}/submit or /api/rooms/{roomId}/leave. */
function extractRoomIdForAction(pathname: string): string | null {
	const match = pathname.match(/^\/api\/rooms\/([^/]+)\/(submit|leave|timer-expiry|spectate)$/);
	return match ? match[1] : null;
}

export async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    logger.info("proxy", "Request", { method: request.method, pathname, search });

    if (!isSiteLockEnabled()) {
        logger.info("proxy", "Site lock disabled, allowing request");
        return;
    }

    if (isAuthPath(pathname)) {
        logger.info("proxy", "Auth path, allowing request");
        return;
    }

    const expected = await siteAccessToken(envGet("SITE_PASSWORD")!);
    const token = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
    if (token === expected) {
        logger.info("proxy", "Valid site access token, allowing request");
        return;
    }

    // Room invite paths are accessible without site auth.
    if (isRoomInvitePath(pathname, request.method)) {
        logger.info("proxy", "Room invite path, allowing request");
        return;
    }

    // Room action paths (submit, leave) require room-specific cookie for non-site-authenticated users.
    const roomActionId = extractRoomIdForAction(pathname);
    if (roomActionId && (request.method === "POST" || request.method === "DELETE")) {
        const roomCookieName = roomAccessCookie(roomActionId);
        const roomCookie = request.cookies.get(roomCookieName)?.value;
        if (roomCookie === "1") {
            logger.info("proxy", "Valid room access cookie", { roomId: roomActionId });
            return;
        }
    }

    if (pathname.startsWith("/api/")) {
        logger.info("proxy", "API path without auth, returning 401");
        return NextResponse.json({ error: "Site locked" }, { status: 401 });
    }

    logger.info("proxy", "Redirecting to login", { returnTo: pathname + search });
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = SITE_LOGIN_PATH;
    loginUrl.search = "";
    if (pathname !== "/") {
        loginUrl.searchParams.set(
            "returnTo",
            pathname + search,
        );
    }
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
