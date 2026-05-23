import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addPlayer,
  buildInitialGameState,
  decreasePlayerHealth,
  endGame,
  getPlayerByClientId,
  nextTurn,
  progressNextTurn,
  removePlayer,
  toGameStateEmit,
} from "@/shared/GameState";
import { DEFAULT_HEALTH } from "@/shared/consts";
import type { DictionaryEntry, GameState, GameStateEmit, PlayerWithId } from "@/shared/types";
import { buildMatchLetterForLanguage, getAlivePlayerCount } from "@/shared/utils";
import {
  matchLetterFromWord,
  randomWord,
  validateWord,
  wordStartsWithMatchLetter,
  type GameLanguage,
} from "@/lib/dictionary";
import {
  archiveRoom,
  buildFreshRoomState,
  fetchRoom,
  fetchRoomByInviteCode,
  generateInviteCode,
  persistRoomState,
  rowToGameState,
} from "./roomDb";
import type { RoomListItem, RoomRow } from "./roomTypes";

export type JoinResult =
  | { success: true; roomId: string; gameState: GameStateEmit; player: PlayerWithId }
  | { success: false; reason: string };

export type SubmitResult =
  | { success: true; gameState: GameStateEmit; definition?: DictionaryEntry }
  | { success: false; reason: string; gameState?: GameStateEmit };

export async function createRoom(
  admin: SupabaseClient,
  hostUserId: string,
  options: {
    roomName: string;
    language: GameLanguage;
    isPrivate: boolean;
  }
): Promise<RoomRow> {
  const word = await randomWord(options.language);
  const matchChar = matchLetterFromWord(word, options.language);
  const state = buildFreshRoomState(options.language, matchChar);

  let inviteCode = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin
      .from("rooms")
      .insert({
        roomname: options.roomName,
        playercount: 0,
        invite_code: inviteCode,
        is_private: options.isPrivate,
        language: options.language,
        host_user_id: hostUserId,
        status: state.status,
        match_letter: state.matchLetter,
        turn: state.turn,
        players: state.players,
        player_user_map: {},
        connected_players: 0,
      })
      .select("*")
      .single();

    if (!error && data) return data as RoomRow;
    if (error?.code !== "23505") throw error;
    inviteCode = generateInviteCode();
  }
  throw new Error("Failed to generate unique invite code");
}

export async function joinRoom(
  admin: SupabaseClient,
  roomId: string,
  userId: string,
  displayName: string
): Promise<JoinResult> {
  const row = await fetchRoom(admin, roomId);
  if (!row || row.archived_at) {
    return { success: false, reason: "Room not found" };
  }

  let state: GameState = { ...rowToGameState(row), language: row.language };
  const existing = getPlayerByClientId(state, userId);
  if (existing) {
    return {
      success: true,
      roomId,
      gameState: toGameStateEmit(state),
      player: existing,
    };
  }

  if (state.connectedPlayers >= 4) {
    return { success: false, reason: "Room is full" };
  }

  const player: PlayerWithId = {
    uid: userId,
    name: displayName,
    lastWord: "",
    health: DEFAULT_HEALTH,
  };

  state = { ...addPlayer(state, player), language: row.language };
  state.socketPlayerMap?.set(userId, player.seat!);
  await persistRoomState(admin, roomId, state);

  const joined = getPlayerByClientId(state, userId)!;
  return {
    success: true,
    roomId,
    gameState: toGameStateEmit(state),
    player: joined,
  };
}

export async function joinRoomByInviteCode(
  admin: SupabaseClient,
  inviteCode: string,
  userId: string,
  displayName: string
): Promise<JoinResult> {
  const row = await fetchRoomByInviteCode(admin, inviteCode);
  if (!row) return { success: false, reason: "Invalid invite code" };
  return joinRoom(admin, row.roomid, userId, displayName);
}

export async function startGame(
  admin: SupabaseClient,
  roomId: string,
  hostUserId: string
): Promise<{ success: boolean; reason?: string; gameState?: GameStateEmit }> {
  const row = await fetchRoom(admin, roomId);
  if (!row) return { success: false, reason: "Room not found" };
  if (row.host_user_id !== hostUserId) {
    return { success: false, reason: "Only the host can start the game" };
  }

  let state: GameState = { ...rowToGameState(row), language: row.language };
  if (state.connectedPlayers < 1) {
    return { success: false, reason: "Need at least one player" };
  }

  state = { ...state, status: "playing" };
  await persistRoomState(admin, roomId, state);
  return { success: true, gameState: toGameStateEmit(state) };
}

export async function submitWord(
  admin: SupabaseClient,
  roomId: string,
  userId: string,
  word: string
): Promise<SubmitResult> {
  const row = await fetchRoom(admin, roomId);
  if (!row || row.archived_at) {
    return { success: false, reason: "Room not found" };
  }

  const language = row.language;
  let state: GameState = { ...rowToGameState(row), language: row.language };

  if (state.status !== "playing") {
    return { success: false, reason: "Game is not in progress" };
  }

  const player = getPlayerByClientId(state, userId);
  if (!player || player.seat === undefined) {
    return { success: false, reason: "Player not in room" };
  }

  const currentMatchLetter = state.matchLetter.block;
  if (!wordStartsWithMatchLetter(word, currentMatchLetter, language)) {
    return invalidWord(admin, roomId, state, userId, `Word must start with "${currentMatchLetter}"`);
  }

  const valid = await validateWord(word, language);
  if (!valid) {
    return invalidWord(admin, roomId, state, userId, `Word is not valid`);
  }

  const block =
    language === "en"
      ? matchLetterFromWord(word, language)
      : word.slice(-1);

  let nextState = progressNextTurn(state, block, word);
  await persistRoomState(admin, roomId, nextState);

  return {
    success: true,
    gameState: toGameStateEmit(nextState),
    definition: valid[1],
  };
}

async function invalidWord(
  admin: SupabaseClient,
  roomId: string,
  state: GameState,
  userId: string,
  reason: string
): Promise<SubmitResult> {
  const player = getPlayerByClientId(state, userId);
  if (!player || player.seat === undefined) {
    return { success: false, reason };
  }

  const playerDead = player.health === 1;
  const shouldEndGame = playerDead && getAlivePlayerCount(state) === 2;

  let nextState = decreasePlayerHealth(state, player.health, player.seat);
  if (shouldEndGame) {
    nextState = endGame(nextState);
    await persistRoomState(admin, roomId, nextState);
    await archiveRoom(admin, roomId, "finished");
    return {
      success: false,
      reason,
      gameState: toGameStateEmit(nextState),
    };
  }

  if (playerDead) {
    nextState = nextTurn(nextState);
  }

  await persistRoomState(admin, roomId, nextState);
  return {
    success: false,
    reason,
    ...(playerDead ? { gameState: toGameStateEmit(nextState) } : {}),
  };
}

export async function leaveRoom(
  admin: SupabaseClient,
  roomId: string,
  userId: string
): Promise<GameStateEmit | null> {
  const row = await fetchRoom(admin, roomId);
  if (!row) return null;

  let state: GameState = { ...rowToGameState(row), language: row.language };
  const player = getPlayerByClientId(state, userId);
  if (!player) return toGameStateEmit(state);

  state = { ...removePlayer(state, player), language: row.language };
  if (state.connectedPlayers === 0) {
    state = { ...state, status: "waiting", turn: 0 };
  }
  await persistRoomState(admin, roomId, state);
  return toGameStateEmit(state);
}

export { listPublicRooms } from "./roomDb";
export type { RoomListItem };
