import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/lib/auth/session";
import { joinRoom, joinRoomByInviteCode } from "@/lib/game/roomService";

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json();
		const displayName = String(body.displayName ?? "Player").slice(0, 40);
		const admin = getAdmin();

		if (body.inviteCode) {
			const result = await joinRoomByInviteCode(
				admin,
				String(body.inviteCode),
				user.id,
				displayName
			);
			return NextResponse.json(result, { status: result.success ? 200 : 400 });
		}

		if (body.roomId) {
			const result = await joinRoom(admin, String(body.roomId), user.id, displayName);
			return NextResponse.json(result, { status: result.success ? 200 : 400 });
		}

		return NextResponse.json({ error: "roomId or inviteCode required" }, { status: 400 });
	} catch (e) {
		console.error("[POST /api/rooms/join]", e);
		return NextResponse.json({ error: "Join failed" }, { status: 500 });
	}
}
