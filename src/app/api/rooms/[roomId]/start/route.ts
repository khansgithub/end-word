import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/app/server/auth/session";
import { startGame } from "@/app/server/game/roomService";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(_request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { roomId } = await params;
		const admin = getAdmin();
		const result = await startGame(admin, roomId, user.id);
		return NextResponse.json(result, { status: result.success ? 200 : 400 });
	} catch (e) {
		console.error("[POST /api/rooms/:id/start]", e);
		return NextResponse.json({ error: "Start failed" }, { status: 500 });
	}
}
