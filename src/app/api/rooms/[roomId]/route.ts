import { NextResponse } from "next/server";
import { getAdmin } from "@/app/server/auth/session";
import { fetchRoom, rowToGameState } from "@/app/server/game/roomDb";
import { toGameStateEmit } from "@/shared/GameState";

type Params = { params: Promise<{ roomId: string }> };

export async function GET(_request: Request, { params }: Params) {
	try {
		const { roomId } = await params;
		const admin = getAdmin();
		const row = await fetchRoom(admin, roomId);
		if (!row || row.archived_at) {
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}
		const state = rowToGameState(row);
		return NextResponse.json({
			room: {
				roomid: row.roomid,
				roomname: row.roomname,
				invite_code: row.invite_code,
				is_private: row.is_private,
				language: row.language,
				host_user_id: row.host_user_id,
				status: row.status,
			},
			gameState: toGameStateEmit(state),
		});
	} catch (e) {
		console.error("[GET /api/rooms/:id]", e);
		return NextResponse.json({ error: "Failed to load room" }, { status: 500 });
	}
}
