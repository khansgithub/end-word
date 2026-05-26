import { NextResponse } from "next/server";
import { getAdmin, getSessionUser } from "@/app/server/auth/session";
import { submitWord } from "@/app/server/game/roomService";
import type { SubmitResult } from "@/shared/types";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json(
			{ success: false, reason: "Unauthorized" },
			{ status: 401 }
		);
	}

	try {
		const { roomId } = await params;
		const body = await request.json();
		const word = String(body.word ?? "");
		const admin = getAdmin();
		const result: SubmitResult = await submitWord(admin, roomId, user.id, word);
		console.log("[POST /api/rooms/:id/submit] result:", JSON.stringify(result, null, 2));
		return NextResponse.json(result, { status: 200 });
	} catch (e) {
		console.error("[POST /api/rooms/:id/submit]", e);
		return NextResponse.json(
			{ success: false, reason: "Submit failed" },
			{ status: 500 }
		);
	}
}
