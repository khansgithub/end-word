import { NextResponse } from "next/server";
import { getAdmin, getSessionUser } from "@/app/server/auth/session";
import { timerExpired, type TimerExpiryResult } from "@/app/server/game/roomService";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(_request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json(
			{ success: false, reason: "Unauthorized" },
			{ status: 401 }
		);
	}

	try {
		const { roomId } = await params;
		const admin = getAdmin();
		const result: TimerExpiryResult = await timerExpired(admin, roomId, user.id);
		return NextResponse.json(result, { status: 200 });
	} catch (e) {
		console.error("[POST /api/rooms/:id/timer-expiry]", e);
		return NextResponse.json(
			{ success: false, reason: "Timer expiry failed" },
			{ status: 500 }
		);
	}
}
