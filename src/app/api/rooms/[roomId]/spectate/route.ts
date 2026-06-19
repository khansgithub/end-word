import { NextResponse } from "next/server";
import { getSessionUser, getAdmin } from "@/app/server/auth/session";
import { fetchRoom, addRoomSpectator, removeRoomSpectator } from "@/app/server/game/roomDb";
import { broadcastRoomGameState, broadcastRoomSpectators } from "@/app/server/game/roomBroadcast";
import { leaveRoom } from "@/app/server/game/roomService";
import { toGameStateEmit } from "@/shared/GameState";
import { rowToGameState } from "@/shared/roomRow";
import { roomAccessCookie } from "@/shared/site-lock";
import { envGet } from "@/app/server/env";
import { logger } from "@/app/server/logging";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		logger.info("POST /api/rooms/:id/spectate", "Unauthorized");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { roomId } = await params;
		const admin = getAdmin();
		const row = await fetchRoom(admin, roomId);

		if (!row || row.archived_at) {
			logger.info("POST /api/rooms/:id/spectate", "Room not found", { roomId });
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}

		const existingSpectators = row.spectators ?? [];
		if (existingSpectators.some((s) => s.uid === user.id)) {
			logger.info("POST /api/rooms/:id/spectate", "Already spectating", { roomId, userId: user.id });
			const response = NextResponse.json({
				success: true,
				message: "Already spectating",
				gameState: toGameStateEmit(rowToGameState(row)),
				spectators: existingSpectators,
			});
			response.cookies.set(roomAccessCookie(roomId), "1", {
				httpOnly: true,
				secure: envGet("NODE_ENV") === "production",
				sameSite: "lax",
				maxAge: 60 * 60 * 24,
				path: "/",
			});
			return response;
		}

		const displayName = user.user_metadata?.display_name ?? user.email ?? "Spectator";

		let dissolved = false;
		let gameState = toGameStateEmit(rowToGameState(row));

		const isPlayer = row.player_user_map?.[user.id] !== undefined;
		if (isPlayer) {
			const leaveResult = await leaveRoom(admin, roomId, user.id);
			dissolved = leaveResult.dissolved;
			if (leaveResult.gameState) {
				gameState = leaveResult.gameState;
			}
		}

		if (dissolved) {
			logger.info("POST /api/rooms/:id/spectate", "Room dissolved", { roomId });
			return NextResponse.json({
				success: false,
				reason: "Room dissolved",
				dissolved: true,
			});
		}

		const updatedSpectators = await addRoomSpectator(admin, roomId, {
			uid: user.id,
			name: displayName,
		});

		await broadcastRoomSpectators(roomId, updatedSpectators);

		if (!isPlayer) {
			const updatedRow = await fetchRoom(admin, roomId);
			if (updatedRow) {
				gameState = toGameStateEmit(rowToGameState(updatedRow));
			}
		}

		logger.info("POST /api/rooms/:id/spectate", "Spectate success", { roomId, userId: user.id, spectatorCount: updatedSpectators.length });

		const response = NextResponse.json({
			success: true,
			gameState,
			spectators: updatedSpectators,
		});

		response.cookies.set(roomAccessCookie(roomId), "1", {
			httpOnly: true,
			secure: envGet("NODE_ENV") === "production",
			sameSite: "lax",
			maxAge: 60 * 60 * 24,
			path: "/",
		});

		return response;
	} catch (e) {
		logger.error("POST /api/rooms/:id/spectate", "Spectate failed", { error: String(e) });
		return NextResponse.json({ error: "Spectate failed" }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: Params) {
	const user = await getSessionUser();
	if (!user) {
		logger.info("DELETE /api/rooms/:id/spectate", "Unauthorized");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { roomId } = await params;
		const admin = getAdmin();
		const updated = await removeRoomSpectator(admin, roomId, user.id);
		await broadcastRoomSpectators(roomId, updated);
		logger.info("DELETE /api/rooms/:id/spectate", "Spectator removed", { roomId, userId: user.id });
		const response = NextResponse.json({ success: true });
		response.cookies.delete(roomAccessCookie(roomId));
		return response;
	} catch (e) {
		logger.error("DELETE /api/rooms/:id/spectate", "Remove spectator failed", { error: String(e) });
		return NextResponse.json({ error: "Remove spectator failed" }, { status: 500 });
	}
}
