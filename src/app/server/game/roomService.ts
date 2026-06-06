import {
	matchLetterFromWord,
	randomWord,
	validateWord,
	wordStartsWithMatchLetter,
} from "@/app/server/dictionary";
import { resolveKoreanExplanation } from "@/app/server/dictionary/english-korean";
import { broadcastRoomGameState } from "@/app/server/game/roomBroadcast";
import {
	archiveRoom,
	buildFreshRoomState,
	dissolveRoom,
	fetchRoom,
	fetchRoomByInviteCode,
	generateInviteCode,
	persistRoomState,
	rowToGameState,
} from "@/app/server/game/roomDb";
import type { RoomListItem, RoomRow } from "@/shared/roomTypes";
import {
	addPlayer,
	decreasePlayerHealth,
	endGame,
	getPlayerByClientId,
	nextTurn,
	progressNextTurn,
	compactActivePlayers,
	markPlayerLeft,
	removePlayer,
	toGameStateEmit
} from "@/shared/GameState";
import { isActivePlayer, normalizeEnglishWord } from "@/shared/utils";
import { DEFAULT_HEALTH, ENGLISH_MIN_WORD_LENGTH } from "@/shared/consts";
import type { GameLanguage, GameState, GameStateEmit, PlayerWithId, SubmitResult } from "@/shared/types";
import { isWordAlreadyUsed } from "@/shared/usedWords";
import { shouldEndGameOnPlayerDeath } from "@/shared/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

export type JoinResult =
	| { success: true; roomId: string; gameState: GameStateEmit; player: PlayerWithId }
	| { success: false; reason: string };

function findPlayerByUserId(state: GameState, userId: string): PlayerWithId | null {
	const fromMap = getPlayerByClientId(state, userId);
	if (fromMap) return fromMap;

	const fromArray = state.players.find(
		(p) => p != null && "uid" in p && p.uid === userId
	);
	if (!fromArray || !("uid" in fromArray) || !fromArray.uid) return null;
	return fromArray as PlayerWithId;
}

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
	const matchChar = await matchLetterFromWord(word, options.language);
	const state = buildFreshRoomState(options.language, matchChar);

	let inviteCode = generateInviteCode();
	for (let attempt = 0; attempt < 5; attempt++) {
		const { data, error } = await admin
			.from("rooms")
			.insert({
				roomid: crypto.randomUUID(),
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
	const existing = findPlayerByUserId(state, userId);
	if (existing) {
		if (existing.seat !== undefined) {
			state.socketPlayerMap?.set(userId, existing.seat);
		}
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

	const joined = findPlayerByUserId(state, userId);
	if (!joined || joined.seat === undefined) {
		return { success: false, reason: "Failed to join room" };
	}

	state.socketPlayerMap?.set(userId, joined.seat);
	const joinedEmit = toGameStateEmit(state);
	await persistRoomState(admin, roomId, state);
	await broadcastRoomGameState(admin, roomId, joinedEmit);

	return {
		success: true,
		roomId,
		gameState: joinedEmit,
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
	if (state.connectedPlayers < 2) {
		return { success: false, reason: "Need at least two players to start" };
	}

	if (state.status === "playing") {
		return { success: true, gameState: toGameStateEmit(state) };
	}

	state = { ...state, status: "playing" };
	const startedEmit = toGameStateEmit(state);
	await persistRoomState(admin, roomId, state);
	await broadcastRoomGameState(admin, roomId, startedEmit);
	return { success: true, gameState: startedEmit };
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
	const state: GameState = { ...rowToGameState(row), language: row.language };

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

	if (isWordAlreadyUsed(state, word)) {
		return invalidWord(admin, roomId, state, userId, "Word already used");
	}

	if (language === "en" && normalizeEnglishWord(word).length < ENGLISH_MIN_WORD_LENGTH) {
		return invalidWord(
			admin,
			roomId,
			state,
			userId,
			`Word must be at least ${ENGLISH_MIN_WORD_LENGTH} letters`,
		);
	}

	const valid = await validateWord(word, language);
	if (!valid) {
		return invalidWord(admin, roomId, state, userId, `Word is not valid`);
	}
	const definition = valid[1];
	if (language === "en") {
		const korean = await resolveKoreanExplanation(admin, word);
		definition.data = definition.data.map((entry) => ({
			...entry,
			koreanDefinition: korean.definition,
			koreanDefinitionUrl: korean.linkUrl,
		}));
	}
	const block =
		language === "en"
			? await matchLetterFromWord(word, language)
			: word.slice(-1);

	const nextState = progressNextTurn(state, block, word);
	await persistRoomState(admin, roomId, nextState);

	return {
		success: true,
		gameState: toGameStateEmit(nextState),
		definition,
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
	const shouldEndGame = shouldEndGameOnPlayerDeath(state, player.health);

	let nextState = decreasePlayerHealth(state, player.health, player.seat);
	if (shouldEndGame) {
		nextState = endGame(nextState);
		const emit = toGameStateEmit(nextState);
		// Persist finished state before archive so Realtime delivers to other players
		// (RLS blocks SELECT on archived rows for postgres_changes subscribers).
		await persistRoomState(admin, roomId, nextState);
		await broadcastRoomGameState(admin, roomId, emit);
		await archiveRoom(admin, roomId, "finished");
		return {
			success: false,
			reason,
			gameState: emit,
		};
	}

	if (playerDead) {
		nextState = nextTurn(nextState);
	}

	await persistRoomState(admin, roomId, nextState);
	return {
		success: false,
		reason,
		gameState: toGameStateEmit(nextState),
	};
}

export async function leaveRoom(
	admin: SupabaseClient,
	roomId: string,
	userId: string
): Promise<{ dissolved: boolean; gameState: GameStateEmit | null }> {
	const row = await fetchRoom(admin, roomId);
	if (!row) return { dissolved: false, gameState: null };

	if (row.host_user_id === userId) {
		await dissolveRoom(admin, roomId);
		return { dissolved: true, gameState: null };
	}

	let state: GameState = { ...rowToGameState(row), language: row.language };
	const player = getPlayerByClientId(state, userId);
	if (!player) return { dissolved: false, gameState: toGameStateEmit(state) };

	const activeBeforeLeave = state.players.filter((p) => isActivePlayer(p)).length;

	if (activeBeforeLeave <= 2) {
		state = removePlayer(state, player);
		state = compactActivePlayers(state);
	} else {
		state = markPlayerLeft(state, player);
	}

	state = { ...state, language: row.language };
	if (state.connectedPlayers === 0) {
		state = { ...state, status: "waiting", turn: 0 };
	}

	const emit = toGameStateEmit(state);
	await persistRoomState(admin, roomId, state);
	await broadcastRoomGameState(admin, roomId, emit);
	return { dissolved: false, gameState: emit };
}

/** Called by remaining players when presence shows the host disconnected. */
export async function dissolveRoomAsMember(
	admin: SupabaseClient,
	roomId: string,
	userId: string
): Promise<{ dissolved: boolean }> {
	const row = await fetchRoom(admin, roomId);
	if (!row || row.archived_at) return { dissolved: false };
	if (row.host_user_id === userId) return { dissolved: false };

	if (row.player_user_map[userId] === undefined) return { dissolved: false };

	const dissolved = await dissolveRoom(admin, roomId);
	return { dissolved };
}

export { listPublicRooms } from "@/app/server/game/roomDb";
export type { RoomListItem };

