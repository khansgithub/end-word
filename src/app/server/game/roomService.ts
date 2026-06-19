import {
	matchLetterFromWord,
	randomWord,
	validateWord,
	wordStartsWithMatchLetter,
} from "@/app/server/dictionary";
import { resolveKoreanExplanation } from "@/app/server/dictionary/english-korean";
import { broadcastRoomGameState, broadcastRoomWordDefinition, broadcastRoomSpectators } from "@/app/server/game/roomBroadcast";
import {
	archiveRoom,
	buildFreshRoomState,
	dissolveRoom,
	fetchRoom,
	fetchRoomByInviteCode,
	generateInviteCode,
	persistRoomState,
	removeRoomSpectator,
	rowToGameState,
} from "@/app/server/game/roomDb";
import type { RoomListItem, RoomRow } from "@/shared/roomTypes";
import {
	addPlayer,
	decreasePlayerHealth,
	endGame,
	getPlayerByClientId,
	killPlayer,
	nextTurn,
	progressNextTurn,
	setTimerForPlayer,
	compactActivePlayers,
	markPlayerLeft,
	removePlayer,
	toGameStateEmit
} from "@/shared/GameState";
import { isActivePlayer, normalizeEnglishWord, getAlivePlayerCount, shouldEndGameOnPlayerDeath } from "@/shared/utils";
import { DEFAULT_HEALTH, ENGLISH_MIN_WORD_LENGTH } from "@/shared/consts";
import type { GameLanguage, GameState, GameStateEmit, PlayerWithId, SubmitResult } from "@/shared/types";
import { isWordAlreadyUsed } from "@/shared/usedWords";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/app/server/logging";

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
		timerDuration?: number;
	}
): Promise<RoomRow> {
	const word = await randomWord(options.language);
	const matchChar = await matchLetterFromWord(word, options.language);
	const state = buildFreshRoomState(options.language, matchChar, options.timerDuration);

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
				timer_duration: state.timerDuration,
			})
			.select("*")
			.single();

		if (!error && data) {
			logger.info("roomService", "createRoom success", { roomId: data.roomid });
			return data as RoomRow;
		}
		if (error?.code !== "23505") throw error;
		inviteCode = generateInviteCode();
	}
	logger.error("roomService", "createRoom failed to generate unique invite code");
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
		logger.info("roomService", "joinRoom room not found", { roomId });
		return { success: false, reason: "Room not found" };
	}

	let state: GameState = { ...rowToGameState(row), language: row.language };
	const existing = findPlayerByUserId(state, userId);
	if (existing) {
		if (existing.seat !== undefined) {
			state.socketPlayerMap?.set(userId, existing.seat);
		}
		logger.info("roomService", "joinRoom existing player", { roomId, userId });
		return {
			success: true,
			roomId,
			gameState: toGameStateEmit(state),
			player: existing,
		};
	}

	if (row.status !== "waiting") {
		logger.info("roomService", "joinRoom game already started", { roomId, status: row.status });
		return { success: false, reason: "Game already started" };
	}

	if (state.connectedPlayers >= 4) {
		logger.info("roomService", "joinRoom room full", { roomId });
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
		logger.info("roomService", "joinRoom failed to join", { roomId, userId });
		return { success: false, reason: "Failed to join room" };
	}

	state.socketPlayerMap?.set(userId, joined.seat);
	const joinedEmit = toGameStateEmit(state);
	await persistRoomState(admin, roomId, state);
	await broadcastRoomGameState(admin, roomId, joinedEmit);

	logger.info("roomService", "joinRoom success", { roomId, userId, playerCount: state.connectedPlayers });
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
	if (!row) {
		logger.info("roomService", "startGame room not found", { roomId });
		return { success: false, reason: "Room not found" };
	}
	if (row.host_user_id !== hostUserId) {
		logger.info("roomService", "startGame not host", { roomId, hostUserId });
		return { success: false, reason: "Only the host can start the game" };
	}

	let state: GameState = { ...rowToGameState(row), language: row.language };
	if (state.connectedPlayers < 2) {
		logger.info("roomService", "startGame not enough players", { roomId, playerCount: state.connectedPlayers });
		return { success: false, reason: "Need at least two players to start" };
	}

	if (state.status === "playing") {
		logger.info("roomService", "startGame already playing", { roomId });
		return { success: true, gameState: toGameStateEmit(state) };
	}

	state = { ...state, status: "playing" };
	const startedEmit = toGameStateEmit(state);
	await persistRoomState(admin, roomId, state);
	await broadcastRoomGameState(admin, roomId, startedEmit);
	logger.info("roomService", "startGame success", { roomId });
	return { success: true, gameState: startedEmit };
}

export async function submitWord(
	admin: SupabaseClient,
	roomId: string,
	userId: string,
	word: string,
	timeRemaining?: number
): Promise<SubmitResult> {
	logger.info("roomService", "submitWord", { word, timeRemaining });
	const row = await fetchRoom(admin, roomId);
	if (!row || row.archived_at) {
		logger.info("roomService", "submitWord room not found", { roomId, userId });
		return { success: false, reason: "Room not found" };
	}

	const language = row.language;
	const state: GameState = { ...rowToGameState(row), language: row.language };

	if (state.status !== "playing") {
		logger.info("roomService", "submitWord not playing", { roomId, userId });
		return { success: false, reason: "Game is not in progress" };
	}

	const player = getPlayerByClientId(state, userId);
	if (!player || player.seat === undefined) {
		logger.info("roomService", "submitWord player not in room", { roomId, userId });
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

	const stateWithTimer =
		timeRemaining !== undefined
			? setTimerForPlayer(state, timeRemaining, player.seat)
			: state;
	const nextState = progressNextTurn(stateWithTimer, block, word);
	await persistRoomState(admin, roomId, nextState);

	const emit = toGameStateEmit(nextState);
	await broadcastRoomWordDefinition(admin, roomId, definition);

	logger.info("roomService", "submitWord success", { roomId, userId, word });
	return {
		success: true,
		gameState: emit,
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
		logger.info("roomService", "invalidWord player not found", { roomId, userId, reason });
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
		logger.info("roomService", "invalidWord game ended", { roomId, userId, reason });
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
	logger.info("roomService", "invalidWord health decreased", { roomId, userId, reason, playerDead });
	return {
		success: false,
		reason,
		gameState: toGameStateEmit(nextState),
	};
}

export type TimerExpiryResult =
	| { success: true; gameState: GameStateEmit }
	| { success: false; reason: string };

/**
 * Called when a player's timer expires.
 * Kills the player (health → 0), advances the turn,
 * and ends the game if only one (or zero) players remain alive.
 */
export async function timerExpired(
	admin: SupabaseClient,
	roomId: string,
	userId: string
): Promise<TimerExpiryResult> {
	const row = await fetchRoom(admin, roomId);
	if (!row || row.archived_at) {
		logger.info("roomService", "timerExpired room not found", { roomId });
		return { success: false, reason: "Room not found" };
	}

	const state: GameState = { ...rowToGameState(row), language: row.language };

	if (state.status !== "playing") {
		logger.info("roomService", "timerExpired not playing", { roomId });
		return { success: false, reason: "Game is not in progress" };
	}

	const player = getPlayerByClientId(state, userId);
	if (!player || player.seat === undefined) {
		logger.info("roomService", "timerExpired player not in room", { roomId, userId });
		return { success: false, reason: "Player not in room" };
	}

	let nextState: GameState = killPlayer(state, player.seat);

	const aliveCount = getAlivePlayerCount(nextState);
	if (aliveCount <= 1) {
		nextState = endGame(nextState);
		await persistRoomState(admin, roomId, nextState);
		await broadcastRoomGameState(admin, roomId, toGameStateEmit(nextState));
		await archiveRoom(admin, roomId, "finished");
		logger.info("roomService", "timerExpired game ended", { roomId, userId, aliveCount });
		return { success: true, gameState: toGameStateEmit(nextState) };
	}

	nextState = nextTurn(nextState);
	await persistRoomState(admin, roomId, nextState);
	await broadcastRoomGameState(admin, roomId, toGameStateEmit(nextState));
	logger.info("roomService", "timerExpired turn advanced", { roomId, userId, aliveCount });
	return { success: true, gameState: toGameStateEmit(nextState) };
}

export async function leaveRoom(
	admin: SupabaseClient,
	roomId: string,
	userId: string
): Promise<{ dissolved: boolean; gameState: GameStateEmit | null }> {
	const row = await fetchRoom(admin, roomId);
	if (!row) {
		logger.info("roomService", "leaveRoom room not found", { roomId });
		return { dissolved: false, gameState: null };
	}

	if (row.host_user_id === userId) {
		logger.info("roomService", "leaveRoom host dissolved", { roomId, userId });
		await dissolveRoom(admin, roomId);
		return { dissolved: true, gameState: null };
	}

	let state: GameState = { ...rowToGameState(row), language: row.language };
	const player = getPlayerByClientId(state, userId);
	if (!player) {
		logger.info("roomService", "leaveRoom player not found", { roomId, userId });
		return { dissolved: false, gameState: toGameStateEmit(state) };
	}

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

	const updated = await removeRoomSpectator(admin, roomId, userId);
	if (updated.length > 0 || row.spectators?.some((s) => s.uid === userId)) {
		await broadcastRoomSpectators(roomId, updated);
	}

	logger.info("roomService", "leaveRoom success", { roomId, userId, activeBeforeLeave });
	return { dissolved: false, gameState: emit };
}

/** Called by remaining players when presence shows the host disconnected. */
export async function dissolveRoomAsMember(
	admin: SupabaseClient,
	roomId: string,
	userId: string
): Promise<{ dissolved: boolean }> {
	const row = await fetchRoom(admin, roomId);
	if (!row || row.archived_at) {
		logger.info("roomService", "dissolveRoomAsMember room not found or archived", { roomId });
		return { dissolved: false };
	}
	if (row.host_user_id === userId) {
		logger.info("roomService", "dissolveRoomAsMember is host, skip", { roomId, userId });
		return { dissolved: false };
	}

	if (row.player_user_map[userId] === undefined) {
		logger.info("roomService", "dissolveRoomAsMember not a player", { roomId, userId });
		return { dissolved: false };
	}

	const dissolved = await dissolveRoom(admin, roomId);
	logger.info("roomService", "dissolveRoomAsMember success", { roomId, userId });
	return { dissolved };
}

export { listPublicRooms } from "@/app/server/game/roomDb";
export type { RoomListItem };

