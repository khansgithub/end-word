import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/lib/auth/session";
import { leaveRoom } from "@/lib/game/roomService";

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
		return NextResponse.json(result);
	} catch (e) {
		console.error("[POST /api/rooms/:id/leave]", e);
		return NextResponse.json({ error: "Leave failed" }, { status: 500 });
	}
}
