import type { SupabaseClient } from "@supabase/supabase-js";
import { INVITE_CODE_LENGTH } from "@/shared/consts";
import { buildInitialGameState, toGameStateEmit, type GameState } from "@/shared/GameState";
import type {
  GameStateEmit,
  GameStateServer,
  GameStatus,
  MatchLetter,
  ServerPlayers,
} from "@/shared/types";
import { buildMatchLetterForLanguage } from "@/shared/utils";
import type { GameLanguage } from "@/lib/dictionary";
import type { RoomListItem, RoomRow } from "./roomTypes";

const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return code;
}

export function rowToGameState(row: RoomRow): GameStateServer {
  const map = new Map<string, number>(
    Object.entries(row.player_user_map ?? {}).map(([k, v]) => [k, Number(v)])
  );
  const players = normalizePlayersArray(row.players);
  const matchLetter =
    row.match_letter ??
    buildMatchLetterForLanguage(row.language === "en" ? "a" : "다", row.language);

  return {
    matchLetter,
    status: row.status,
    players,
    connectedPlayers: row.connected_players,
    turn: row.turn,
    socketPlayerMap: map,
    language: row.language,
  };
}

function normalizePlayersArray(players: ServerPlayers): ServerPlayers {
  const base = Array(4).fill(null) as ServerPlayers;
  players.forEach((p, i) => {
    if (i < 4) base[i] = p;
  });
  return base;
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

export function toClientEmit(
  state: GameStateServer,
  userId: string
): GameStateEmit & { roomId?: string } {
  return toGameStateEmit(state);
}

export function buildFreshRoomState(
  language: GameLanguage,
  startingLetter: string
): GameState {
  const state = buildInitialGameState(startingLetter, language);
  return { ...state, language };
}
