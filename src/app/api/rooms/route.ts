import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/app/server/auth/session";
import { createRoom, listPublicRooms } from "@/app/server/game/roomService";
import type { GameLanguage } from "@/shared/types";
import { logger } from "@/app/server/logging";

export async function GET() {
		try {
		const admin = getAdmin();
		const rooms = await listPublicRooms(admin);
		logger.info("GET /api/rooms", "Listed rooms", { count: rooms.length });
		return NextResponse.json({ rooms });
	} catch (e) {
		logger.error("GET /api/rooms", "Failed to list rooms", { error: String(e) });
		return NextResponse.json({ error: "Failed to list rooms" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		logger.info("POST /api/rooms", "Unauthorized");
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
		logger.info("POST /api/rooms", "Room created", { roomId: room.roomid });
		return NextResponse.json({ room });
	} catch (e) {
		logger.error("POST /api/rooms", "Failed to create room", { error: String(e) });
		return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
	}
}
