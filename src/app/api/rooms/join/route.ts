import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/app/server/auth/session";
import { joinRoom, joinRoomByInviteCode } from "@/app/server/game/roomService";
import { fetchRoomByInviteCode } from "@/app/server/game/roomDb";
import { roomAccessCookie } from "@/shared/site-lock";
import { envGet } from "@/app/server/env";

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json();
		const displayName = String(body.displayName ?? "Player").slice(0, 40);
		const admin = getAdmin();

		let roomId: string | undefined;
		let result;

		if (body.inviteCode) {
			result = await joinRoomByInviteCode(
				admin,
				String(body.inviteCode),
				user.id,
				displayName
			);
			const row = await fetchRoomByInviteCode(admin, String(body.inviteCode));
			roomId = row?.roomid;
		} else if (body.roomId) {
			result = await joinRoom(admin, String(body.roomId), user.id, displayName);
			roomId = String(body.roomId);
		} else {
			return NextResponse.json({ error: "roomId or inviteCode required" }, { status: 400 });
		}

		if (result.success && roomId) {
			const response = NextResponse.json(result, { status: 200 });
			response.cookies.set(roomAccessCookie(roomId), "1", {
				httpOnly: true,
				secure: envGet("NODE_ENV") === "production",
				sameSite: "lax",
				maxAge: 60 * 60 * 24, // 24 hours
				path: "/",
			});
			return response;
		}

		return NextResponse.json(result, { status: result.success ? 200 : 400 });
	} catch (e) {
		console.error("[POST /api/rooms/join]", e);
		return NextResponse.json({ error: "Join failed" }, { status: 500 });
	}
}
