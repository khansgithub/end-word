import { NextResponse } from "next/server";
import { getAdmin, getSessionUser } from "@/app/server/auth/session";
import { submitWord } from "@/app/server/game/roomService";
import type { SubmitResult } from "@/shared/types";
import { logger } from "@/app/server/logging";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		logger.info("POST /api/rooms/:id/submit", "Unauthorized");
		return NextResponse.json(
			{ success: false, reason: "Unauthorized" },
			{ status: 401 }
		);
	}

	try {
		const { roomId } = await params;
		const body = await request.json();
		const word = String(body.word ?? "");
		const timeRemaining =
			body.timeRemaining !== undefined ? Number(body.timeRemaining) : undefined;
		const admin = getAdmin();
		const result: SubmitResult = await submitWord(admin, roomId, user.id, word, timeRemaining);
		logger.info("POST /api/rooms/:id/submit", "Submit result", { result });
		return NextResponse.json(result, { status: 200 });
	} catch (e) {
		logger.error("POST /api/rooms/:id/submit", "Submit failed", { error: String(e) });
		return NextResponse.json(
			{ success: false, reason: "Submit failed" },
			{ status: 500 }
		);
	}
}
