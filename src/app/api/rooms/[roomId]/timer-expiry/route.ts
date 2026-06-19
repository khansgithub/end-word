import { NextResponse } from "next/server";
import { getAdmin, getSessionUser } from "@/app/server/auth/session";
import { timerExpired, type TimerExpiryResult } from "@/app/server/game/roomService";
import { logger } from "@/app/server/logging";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(_request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		logger.info("POST /api/rooms/:id/timer-expiry", "Unauthorized");
		return NextResponse.json(
			{ success: false, reason: "Unauthorized" },
			{ status: 401 }
		);
	}

	try {
		const { roomId } = await params;
		const admin = getAdmin();
		const result: TimerExpiryResult = await timerExpired(admin, roomId, user.id);
		logger.info("POST /api/rooms/:id/timer-expiry", "Timer expiry result", { success: result.success });
		return NextResponse.json(result, { status: 200 });
	} catch (e) {
		logger.error("POST /api/rooms/:id/timer-expiry", "Timer expiry failed", { error: String(e) });
		return NextResponse.json(
			{ success: false, reason: "Timer expiry failed" },
			{ status: 500 }
		);
	}
}
