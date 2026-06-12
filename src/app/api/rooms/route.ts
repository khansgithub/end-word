import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/app/server/auth/session";
import { createRoom, listPublicRooms } from "@/app/server/game/roomService";
import type { GameLanguage } from "@/shared/types";

export async function GET() {
	try {
		const admin = getAdmin();
		const rooms = await listPublicRooms(admin);
		return NextResponse.json({ rooms });
	} catch (e) {
		console.error("[GET /api/rooms]", e);
		return NextResponse.json({ error: "Failed to list rooms" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json();
		const roomName = String(body.roomName ?? "Game Room").slice(0, 80);
		const language = (body.language === "en" ? "en" : "ko") as GameLanguage;
		const isPrivate = Boolean(body.isPrivate);
		const timerDuration = typeof body.timerDuration === "number" ? body.timerDuration : undefined;

		const admin = getAdmin();
		const room = await createRoom(admin, user.id, { roomName, language, isPrivate, timerDuration });
		return NextResponse.json({ room });
	} catch (e) {
		console.error("[POST /api/rooms]", e);
		return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
	}
}
