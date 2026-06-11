export const SITE_ACCESS_COOKIE = "end-word-site-access";

export const SITE_LOGIN_PATH = "/site-login";

/** Cookie name for room access when joining via invite (room-specific). */
export function roomAccessCookie(roomId: string): string {
	return `end-word-room-${roomId}`;
}
