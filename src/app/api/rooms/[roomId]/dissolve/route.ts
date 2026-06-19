import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/app/server/auth/session";
import { dissolveRoomAsMember } from "@/app/server/game/roomService";
import { logger } from "@/app/server/logging";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(_request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		logger.info("POST /api/rooms/:id/dissolve", "Unauthorized");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { roomId } = await params;
		const admin = getAdmin();
		const result = await dissolveRoomAsMember(admin, roomId, user.id);
		logger.info("POST /api/rooms/:id/dissolve", "Room dissolved", { roomId, dissolved: result.dissolved });
		return NextResponse.json(result);
	} catch (e) {
		logger.error("POST /api/rooms/:id/dissolve", "Dissolve failed", { error: String(e) });
		return NextResponse.json({ error: "Dissolve failed" }, { status: 500 });
	}
}
