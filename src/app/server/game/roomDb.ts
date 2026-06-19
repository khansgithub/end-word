import type { SupabaseClient } from "@supabase/supabase-js";
import { INVITE_CODE_LENGTH } from "@/shared/consts";
import { buildInitialGameState, toGameStateEmit, type GameState } from "@/shared/GameState";
import type {
	GameStateEmit,
	GameStateServer,
	GameStatus,
	ServerPlayers,
	Spectator,
} from "@/shared/types";
import type { GameLanguage } from "@/shared/types";
import type { RoomListItem, RoomRow } from "@/shared/roomTypes";

export { rowToGameState, isCompletedGameRow } from "@/shared/roomRow";

const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
	let code = "";
	for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
		code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
	}
	return code;
}

export function gameStateToRowPatch(state: GameState): Partial<RoomRow> {
	const playerUserMap: Record<string, number> = {};
	state.socketPlayerMap?.forEach((seat, uid) => {
		playerUserMap[uid] = seat;
	});

	return {
		status: state.status,
		match_letter: state.matchLetter,
		turn: state.turn,
		players: state.players as ServerPlayers,
		player_user_map: playerUserMap,
		connected_players: state.connectedPlayers,
		used_words: state.usedWords ?? [],
		timer_duration: state.timerDuration,
		updated_at: new Date().toISOString(),
	};
}

export async function fetchRoom(
	admin: SupabaseClient,
	roomId: string
): Promise<RoomRow | null> {
	const { data, error } = await admin
		.from("rooms")
		.select("*")
		.eq("roomid", roomId)
		.maybeSingle();
	if (error) throw error;
	return data as RoomRow | null;
}

export async function fetchRoomByInviteCode(
	admin: SupabaseClient,
	inviteCode: string
): Promise<RoomRow | null> {
	const { data, error } = await admin
		.from("rooms")
		.select("*")
		.eq("invite_code", inviteCode.toUpperCase())
		.maybeSingle();
	if (error) throw error;
	return data as RoomRow | null;
}

export async function listPublicRooms(admin: SupabaseClient): Promise<RoomListItem[]> {
	const { data, error } = await admin
		.from("rooms")
		.select(
			"roomid, roomname, invite_code, is_private, language, status, connected_players, host_user_id"
		)
		.eq("is_private", false)
		.is("archived_at", null)
		.in("status", ["waiting", "playing"])
		.order("updated_at", { ascending: false });
	if (error) throw error;
	return (data ?? []) as RoomListItem[];
}

export async function persistRoomState(
	admin: SupabaseClient,
	roomId: string,
	state: GameState
): Promise<void> {
	const patch = gameStateToRowPatch(state);
	const { error } = await admin.from("rooms").update(patch).eq("roomid", roomId);
	if (error) throw error;
}

export async function persistAndArchiveRoom(
	admin: SupabaseClient,
	roomId: string,
	state: GameState
): Promise<void> {
	const patch = {
		...gameStateToRowPatch(state),
		status: "finished" as const,
		archived_at: new Date().toISOString(),
	};
	const { error } = await admin.from("rooms").update(patch).eq("roomid", roomId);
	if (error) throw error;
}

export async function archiveRoom(
	admin: SupabaseClient,
	roomId: string,
	status: GameStatus = "finished"
): Promise<void> {
	const { error } = await admin
		.from("rooms")
		.update({
			status,
			archived_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq("roomid", roomId);
	if (error) throw error;
}

/** Removes a room from the lobby by archiving it (idempotent). */
export async function dissolveRoom(admin: SupabaseClient, roomId: string): Promise<boolean> {
	const row = await fetchRoom(admin, roomId);
	if (!row || row.archived_at) return false;
	await archiveRoom(admin, roomId, row.status === "playing" ? "finished" : "waiting");
	return true;
}

export function toClientEmit(
	state: GameStateServer,
	userId: string
): GameStateEmit & { roomId?: string } {
	return toGameStateEmit(state);
}

export function buildFreshRoomState(
	language: GameLanguage,
	startingLetter: string,
	timerDuration?: number
): GameState {
	const state = buildInitialGameState(startingLetter, language, timerDuration);
	return { ...state, language };
}

export async function fetchRoomSpectators(
	admin: SupabaseClient,
	roomId: string
): Promise<Spectator[]> {
	const row = await fetchRoom(admin, roomId);
	return row?.spectators ?? [];
}

export async function addRoomSpectator(
	admin: SupabaseClient,
	roomId: string,
	spectator: Spectator
): Promise<Spectator[]> {
	const row = await fetchRoom(admin, roomId);
	if (!row) return [];
	const current = row.spectators ?? [];
	if (current.some((s) => s.uid === spectator.uid)) return current;
	const updated = [...current, spectator];
	const { error } = await admin
		.from("rooms")
		.update({ spectators: updated, updated_at: new Date().toISOString() })
		.eq("roomid", roomId);
	if (error) throw error;
	return updated;
}

export async function removeRoomSpectator(
	admin: SupabaseClient,
	roomId: string,
	userId: string
): Promise<Spectator[]> {
	const row = await fetchRoom(admin, roomId);
	if (!row) return [];
	const current = row.spectators ?? [];
	const updated = current.filter((s) => s.uid !== userId);
	const { error } = await admin
		.from("rooms")
		.update({ spectators: updated, updated_at: new Date().toISOString() })
		.eq("roomid", roomId);
	if (error) throw error;
	return updated;
}
