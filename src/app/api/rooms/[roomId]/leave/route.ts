import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/app/server/auth/session";
import { leaveRoom } from "@/app/server/game/roomService";
import { roomAccessCookie } from "@/shared/site-lock";
import { logger } from "@/app/server/logging";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(_request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		logger.info("POST /api/rooms/:id/leave", "Unauthorized");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { roomId } = await params;
		const admin = getAdmin();
		const result = await leaveRoom(admin, roomId, user.id);
		logger.info("POST /api/rooms/:id/leave", "Leave result", { dissolved: result.dissolved });
		const response = NextResponse.json(result);
		response.cookies.delete(roomAccessCookie(roomId));
		return response;
	} catch (e) {
		logger.error("POST /api/rooms/:id/leave", "Leave failed", { error: String(e) });
		return NextResponse.json({ error: "Leave failed" }, { status: 500 });
	}
}
