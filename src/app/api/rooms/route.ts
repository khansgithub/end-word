import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/lib/auth/session";
import { createRoom, listPublicRooms } from "@/lib/game/roomService";
import type { GameLanguage } from "@/lib/dictionary";

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

    const admin = getAdmin();
    const room = await createRoom(admin, user.id, { roomName, language, isPrivate });
    return NextResponse.json({ room });
  } catch (e) {
    console.error("[POST /api/rooms]", e);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
