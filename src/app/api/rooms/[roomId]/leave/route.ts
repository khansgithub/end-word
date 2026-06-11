import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/app/server/auth/session";
import { leaveRoom } from "@/app/server/game/roomService";
import { roomAccessCookie } from "@/shared/site-lock";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(_request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { roomId } = await params;
		const admin = getAdmin();
		const result = await leaveRoom(admin, roomId, user.id);
		const response = NextResponse.json(result);
		response.cookies.delete(roomAccessCookie(roomId));
		return response;
	} catch (e) {
		console.error("[POST /api/rooms/:id/leave]", e);
		return NextResponse.json({ error: "Leave failed" }, { status: 500 });
	}
}
