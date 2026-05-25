import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/lib/auth/session";
import { dissolveRoomAsMember } from "@/lib/game/roomService";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(_request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { roomId } = await params;
		const admin = getAdmin();
		const result = await dissolveRoomAsMember(admin, roomId, user.id);
		return NextResponse.json(result);
	} catch (e) {
		console.error("[POST /api/rooms/:id/dissolve]", e);
		return NextResponse.json({ error: "Dissolve failed" }, { status: 500 });
	}
}
