/***
Notes from gpt:
- no mutations / side effects in the reducer
- Reducers must always return state; implment default for switch/case
- use simple objects rather than classes (Player type vs Player class)
***/

import { ActionDispatch } from "react";
import { DEFAULT_TIMER_DURATION, MAX_PLAYERS } from "@/shared/consts";
import {
	CannotProgressTurnError,
	CurrentStateRequiredError,
	GameStateHasNoThisPlayerError,
	GameStatusInvalidError,
	HealthInvalidError,
	NewPlayerNullError,
	NoAvailableSeatError,
	PlayerMustHaveSeatError,
	PlayerNameMissingError,
	PlayerNotFoundError,
	PlayerUidUndefinedError,
	SeatIndexOutOfBoundsError,
	SocketPlayerMapUndefinedError,
	ThisPlayerUndefinedError,
	UnknownActionTypeError,
} from "@/shared/errors";
import { assertIsRequiredGameState, assertIsRequiredPlayerWithId } from "@/shared/guards";
import { GameState, GameStateClient, GameStateEmit, GameStateFrozen, GameStateServer, GameStatus, Player, PlayersArray, PlayerWithId, ServerPlayers } from "@/shared/types";
import { addUsedWord } from "@/shared/usedWords";
import { buildMatchLetterForLanguage, cloneServerPlayersToClientPlayers, turnToPlayerIndex, pp, getCurrentTurnPlayer, getAlivePlayerCount, isActivePlayer } from "@/shared/utils";

export type GameStateActionsType = {
	[K in keyof typeof GameStateActions]:
	{
		type: K
		payload: Parameters<typeof GameStateActions[K]>
	}
}[keyof typeof GameStateActions];

export type GameStateDispatch = ActionDispatch<[action: GameStateActionsType]>;

// can't most of these just be one function which is passed "update data"? 
// okay the keys here should not be the same the socket events, that makes things confusing
// name them exactly as what they do to the data
// =============================================================================
// REDUCER MAP
// =============================================================================


const GameStateActions = {

	// ========================================
	// Game Progression & Turn Management
	// ========================================
	nextTurn,
	progressNextTurn,
	endGame,

	// ========================================
	// Player State Modification
	// ========================================
	setPlayerLastWord,
	decreasePlayerHealth,

	// ========================================
	// Timer Management
	// ========================================
	tickTimer,
	killPlayer,
	killPlayerAndNextTurn,

	// ========================================
	// Player Registration & Array Management
	// ========================================
	registerPlayer,
	addPlayer,
	addPlayerToArray,
	removePlayer,
	markPlayerLeft,
	compactActivePlayers,

	// ========================================
	// Client specific gamestate actions
	// ========================================
	clientSetIsSubmitting,

	// ========================================
	// General State Updates
	// ========================================
	updateConnectedPlayersCount,
	replaceGameState, // TODO: remove/consider refactor
	gameStateUpdateClient,

} satisfies { [key: string]: (...args: any[]) => GameState };

// =============================================================================
// REDUCER FUNCTIONS
// =============================================================================

// ========================================
// Game Progression & Turn Management
// ========================================
export function nextTurn(state: GameState, currentState?: GameState): GameState {
	return {
		...state,
		turn: state.turn + 1,
	};
}

/**
 * Performas all the actions needed to move to the next turn:
 *  - update the turn value
 *  - update the matchLetter value
 *  - sets the players last word
 * Skips turns for 
 * @param state 
 * @param block 
 * @param playerLastWord 
 * @param currentState 
 * @returns 
 */
export function progressNextTurn(
	state: GameState,
	block: string,
	playerLastWord: string,
	currentState?: GameState
): GameState {
	let nextState: GameState = { ...state };
	let nextTurnPlayer;
	const language = state.language ?? "ko";
	nextState.matchLetter = buildMatchLetterForLanguage(block, language);
	nextState = setPlayerLastWord(nextState, playerLastWord);
	nextState = nextTurn(nextState);

	let maxLoops = 0;
	nextTurnPlayer = getCurrentTurnPlayer(nextState);

	while ((!nextTurnPlayer || !isActivePlayer(nextTurnPlayer) || nextTurnPlayer.health <= 0) && maxLoops < MAX_PLAYERS + 1) {
		nextState = nextTurn(nextState);
		nextTurnPlayer = getCurrentTurnPlayer(nextState);
		maxLoops++;
	}

	if (maxLoops >= MAX_PLAYERS + 1) {
		throw new CannotProgressTurnError();
	}

	return addUsedWord(nextState, playerLastWord);
}

export function endGame(_state?: GameState, currentState?: GameState): GameState {
	const base = currentState ?? _state;
	if (!base) throw new CurrentStateRequiredError();
	return {
		...base,
		status: "finished",
	};
}

// ========================================
// Player State Modification
// ========================================
export function setPlayerLastWord(
	state: GameState,
	playerLastWord: string,
	currentState?: GameState
): GameState {
	const currentPlayerIndex = turnToPlayerIndex(state.turn, state.connectedPlayers);
	const updatedPlayers = clonePlayersArray(state.players);
	const player = updatedPlayers[currentPlayerIndex];

	if (!player) throw new GameStateHasNoThisPlayerError();

	const updatedPlayer = {
		...player,
		lastWord: playerLastWord,
	};

	updatedPlayers[currentPlayerIndex] = updatedPlayer;

	return {
		...state,
		players: updatedPlayers,
	};
}

/**
 * Decreases the health of the player specified by `state.thisPlayer`.
 * Returns the updated game state.
 * @param state - The current game state.
 * @param currentHealth - The current health of the player.
 * @param currentState - The current game state.
 * @returns The updated game state.
 */
export function decreasePlayerHealth(
	state: GameState,
	currentHealth: number,
	playerSeat: number,
	currentState?: GameState
): GameState {
	const newHealth = currentHealth - 1;

	if (currentHealth <= 0) throw new HealthInvalidError();
	if (state.status != "playing") throw new GameStatusInvalidError();

	const updatedPlayers = clonePlayersArray(state.players);
	const player = updatedPlayers[playerSeat];
	if (!player) {
		throw new PlayerNotFoundError(
			`No player found at seat ${playerSeat} in players: ${JSON.stringify(state.players)}`
		);
	}
	updatedPlayers[playerSeat] = { ...player, health: newHealth };

	const nextState: GameState = {
		...state,
		players: updatedPlayers,
	};

	if (nextState.thisPlayer && nextState.thisPlayer.seat === playerSeat) {
		nextState.thisPlayer = { ...nextState.thisPlayer, health: newHealth };
	}

	return nextState;
}

export function clientSetIsSubmitting(
	state: GameStateClient,
	isSubmitting: boolean,
	currentState?: GameStateClient
): GameStateClient {
	return { ...state, submitting: isSubmitting }
}

// ========================================
// Timer Management
// ========================================
export function setTimerForPlayer(
	state: GameState,
	timerValue: number,
	playerSeat: number,
	currentState?: GameState
): GameState {
	const updatedPlayers = clonePlayersArray(state.players);
	const player = updatedPlayers[playerSeat];
	if (!player) return state;

	updatedPlayers[playerSeat] = { ...player, timeRemaining: timerValue };

	const nextState: GameState = {
		...state,
		players: updatedPlayers,
	};

	if (nextState.thisPlayer && nextState.thisPlayer.seat === playerSeat) {
		nextState.thisPlayer = { ...nextState.thisPlayer, timeRemaining: timerValue };
	}

	return nextState;
}

/**
 * Decrements the timeRemaining for the current turn player by 1 second.
 * @param state - The current game state.
 * @param currentState - The current game state.
 * @returns The updated game state.
 */
export function tickTimer(
	state: GameState,
	currentState?: GameState
): GameState {
	const currentPlayerIndex = turnToPlayerIndex(state.turn, state.connectedPlayers);
	const updatedPlayers = clonePlayersArray(state.players);
	const player = updatedPlayers[currentPlayerIndex];
	if (!player) return state;

	const currentTime = player.timeRemaining ?? state.timerDuration;
	const newTime = Math.max(0, currentTime - 1);
	updatedPlayers[currentPlayerIndex] = { ...player, timeRemaining: newTime };

	const nextState: GameState = {
		...state,
		players: updatedPlayers,
	};

	if (nextState.thisPlayer && nextState.thisPlayer.seat === currentPlayerIndex) {
		nextState.thisPlayer = { ...nextState.thisPlayer, timeRemaining: newTime };
	}

	return nextState;
}

/**
 * Sets a player's health to 0 when their timer expires.
 * @param state - The current game state.
 * @param playerSeat - The seat of the player whose timer expired.
 * @param currentState - The current game state.
 * @returns The updated game state.
 */
export function killPlayer(
	state: GameState,
	playerSeat: number,
	currentState?: GameState
): GameState {
	const updatedPlayers = clonePlayersArray(state.players);
	const player = updatedPlayers[playerSeat];
	if (!player) return state;

	updatedPlayers[playerSeat] = { ...player, health: 0, timeRemaining: 0 };

	const nextState: GameState = {
		...state,
		players: updatedPlayers,
	};

	if (nextState.thisPlayer && nextState.thisPlayer.seat === playerSeat) {
		nextState.thisPlayer = { ...nextState.thisPlayer, health: 0, timeRemaining: 0 };
	}

	return nextState;
}

/**
 * Kills the player at the given seat (sets health to 0, timeRemaining to 0)
 * and advances to the next turn in a single operation.
 * This prevents bugs from two separate dispatches using stale state snapshots.
 */
export function killPlayerAndNextTurn(
	state: GameState,
	playerSeat: number,
	currentState?: GameState
): GameState {
	const afterKill = killPlayer(state, playerSeat, currentState);
	return nextTurn(afterKill, currentState);
}

// ========================================
// Player Registration & Array Management
// ========================================
function countConnectedPlayers(state: GameState): number {
	return state.players.filter((p) => isActivePlayer(p)).length;
}

function resolveStatusAfterPlayerCountChange(
	state: GameState,
	connectedPlayers: number,
	previousConnectedPlayers: number
): GameStatus {
	if (state.status === "finished") {
		return "finished";
	}
	if (connectedPlayers <= 1) {
		return "playing";
	}
	if (previousConnectedPlayers < 2 && connectedPlayers >= 2) {
		return "waiting";
	}
	if (state.status === "playing") {
		return "playing";
	}
	return "waiting";
}

function _postPlayerCountUpdateState(
	state: GameState,
	previousConnectedPlayers?: number
): GameState {
	const connectedPlayers = countConnectedPlayers(state);
	const prev = previousConnectedPlayers ?? connectedPlayers;
	const status = resolveStatusAfterPlayerCountChange(
		state,
		connectedPlayers,
		prev
	);
	return {
		...state,
		connectedPlayers,
		status,
	};
}

export function registerPlayer(
	state: GameState,
	player: PlayerWithId,
	currentState?: GameState
): GameState {
	assertIsRequiredPlayerWithId(player);
	const seat = findAvailableSeat(state);
	const playerWithTimer = { ...player, timeRemaining: state.timerDuration };
	const updatedPlayers = insertPlayerIntoArray(state.players, playerWithTimer, seat);
	const newPlayer = updatedPlayers[seat];
	if (newPlayer === null) throw new NewPlayerNullError();
	assertIsRequiredPlayerWithId(newPlayer);
	const previousConnectedPlayers = countConnectedPlayers(state);
	const nextState = _postPlayerCountUpdateState(
		{ ...state, players: updatedPlayers, thisPlayer: newPlayer },
		previousConnectedPlayers
	);

	console.log("registerPlayer in Reducer: next state is: ", pp(nextState));

	return nextState
}

/**
 * This function takes a player (which has not been assigned a seat) and gives it one.
 * This should only be called by the server.
 * @param state 
 * @param player 
 * @returns 
 */
export function addPlayer(
	state: GameState,
	player: PlayerWithId,
	currentState?: GameState
): GameState {
	if (!player.name) {
		console.error("addPlayer: profile.name is undefined")
		throw new PlayerNameMissingError();
	}
	const seat = findAvailableSeat(state);
	const previousConnectedPlayers = countConnectedPlayers(state);
	const playerWithTimer = { ...player, timeRemaining: state.timerDuration };
	const updatedPlayers = insertPlayerIntoArray(state.players, playerWithTimer, seat);
	const nextState = _postPlayerCountUpdateState(
		{ ...state, players: updatedPlayers },
		previousConnectedPlayers
	);
	console.log("addPlayer in Reducer: next state is: ", pp(nextState));
	return nextState;
}

export function addPlayerToArray(
	state: GameState,
	player: PlayerWithId,
	currentState?: GameState
): GameState {
	const updatedPlayers = clonePlayersArray(state.players);
	if (player.seat === undefined) throw new PlayerMustHaveSeatError(pp(player))
	updatedPlayers[player.seat] = { ...player };
	// if (state.thisPlayer) {
	//     const thisPlayer = updatedPlayers[state.thisPlayer.seat] as PlayerWithId;
	//     thisPlayer.uid = state.thisPlayer.uid;
	// }

	const previousConnectedPlayers = countConnectedPlayers(state);
	const nextState = _postPlayerCountUpdateState(
		{
			...state,
			players: updatedPlayers,
		},
		previousConnectedPlayers
	);

	return nextState;
}

export function removePlayer(
	state: GameState,
	player: Player,
	currentState?: GameState
): GameState {
	const playerId = player.seat;
	if (playerId === undefined) {
		throw new PlayerUidUndefinedError();
	}

	// const updatedPlayers = state.players.slice();
	const previousConnectedPlayers = countConnectedPlayers(state);
	const updatedPlayers = clonePlayersArray(state.players);
	updatedPlayers[playerId] = null;
	// TODO: Remove player from map!!
	const playerUid = player.uid;
	if (playerUid === undefined) throw new PlayerUidUndefinedError();
	state.socketPlayerMap?.delete(playerUid);

	const nextState = _postPlayerCountUpdateState(
		{ ...state, players: updatedPlayers },
		previousConnectedPlayers
	);

	return {
		...nextState,
	};
}

export function markPlayerLeft(
	state: GameState,
	player: Player,
	currentState?: GameState
): GameState {
	const playerSeat = player.seat;
	if (playerSeat === undefined) {
		throw new PlayerUidUndefinedError();
	}

	const previousConnectedPlayers = countConnectedPlayers(state);
	const updatedPlayers = clonePlayersArray(state.players);
	const seated = updatedPlayers[playerSeat];
	if (!seated) {
		throw new PlayerNotFoundError(`No player at seat ${playerSeat}`);
	}

	updatedPlayers[playerSeat] = { ...seated, left: true };
	const playerUid = player.uid;
	if (playerUid === undefined) throw new PlayerUidUndefinedError();
	state.socketPlayerMap?.delete(playerUid);

	let nextState = _postPlayerCountUpdateState(
		{ ...state, players: updatedPlayers },
		previousConnectedPlayers
	);

	let loops = 0;
	let current = getCurrentTurnPlayer(nextState);
	while ((!current || !isActivePlayer(current)) && loops < MAX_PLAYERS + 1) {
		nextState = nextTurn(nextState);
		current = getCurrentTurnPlayer(nextState);
		loops++;
	}

	return nextState;
}

/** Move active players to low seats and refresh seat indices / socket map. */
export function compactActivePlayers(state: GameState, currentState?: GameState): GameState {
	const active: PlayerWithId[] = [];
	for (const p of state.players) {
		if (isActivePlayer(p) && p.uid) {
			active.push(p as PlayerWithId);
		}
	}

	const players = makePlayersArray<ServerPlayers>();
	const socketPlayerMap = new Map<string, number>();
	active.forEach((p, i) => {
		const seated = { ...p, seat: i, left: undefined };
		players[i] = seated;
		socketPlayerMap.set(p.uid!, i);
	});

	const previousConnectedPlayers = countConnectedPlayers(state);
	return _postPlayerCountUpdateState(
		{ ...state, players, socketPlayerMap },
		previousConnectedPlayers
	);
}

// ========================================
// General State Updates
// ========================================
export function updateConnectedPlayersCount(state: GameState, count: number, currentState?: GameState): GameState {
	return {
		...state,
		connectedPlayers: count
	}
}

export function replaceGameState(newState: GameState, currentState?: GameState): GameState {
	if (newState.thisPlayer || !currentState?.thisPlayer) {
		return newState;
	}
	return { ...newState, thisPlayer: currentState.thisPlayer };
}

export function gameStateUpdateClient(newState: GameStateEmit, currentState?: GameStateClient): GameStateClient {
	if (!currentState) throw new CurrentStateRequiredError();
	const isGameStarting = currentState.status === "waiting" && newState.status === "playing";
	const freshTimer = isGameStarting ? newState.timerDuration : undefined;

	const seat = currentState.thisPlayer.seat ?? -1;
	const playerFromEmit = newState.players[seat];
	const thisPlayer = playerFromEmit
		? {
			...currentState.thisPlayer,
			...playerFromEmit,
			timeRemaining: freshTimer ?? playerFromEmit.timeRemaining ?? currentState.thisPlayer.timeRemaining,
		}
		: currentState.thisPlayer;

	const mergedPlayers = newState.players.map((p, i) => {
		if (!p) return null;
		const current = currentState.players[i];
		if (!current) return p;
		const timeRemaining = freshTimer ?? (p as Record<string, unknown>).timeRemaining ?? (current as Record<string, unknown>).timeRemaining;
		return { ...p, timeRemaining } as typeof p;
	}) as GameStateEmit["players"];

	return {
		...newState,
		players: mergedPlayers,
		thisPlayer,
	};
}

// =============================================================================
// REDUCER
// =============================================================================
export function gameStateReducer<T>(state: T, action: GameStateActionsType): T {

	if (!Object.keys(GameStateActions).includes(action.type)) {
		throw new UnknownActionTypeError(action.type);
	}

	console.log("in reducer: action > ", action.type);
	// console.log("in reducer: payload > ", action.payload);
	// throw new Error("");

	// idk how to fix the typing issue
	// const f = GameStateActions[action.type] as (state: GameState, ...args: any[]) => GameState;
	const f = GameStateActions[action.type] as (state: GameState, ...args: unknown[]) => GameState;
	const params = action.payload as Parameters<typeof f>;
	return f(...params, state) as T;
}

// =============================================================================
// OTHER FUNCTIONS
// =============================================================================
export function buildInitialGameState(
	block?: string,
	language: "en" | "ko" = "ko",
	timerDuration: number = DEFAULT_TIMER_DURATION
): GameState {
	const players = makePlayersArray<ServerPlayers>();
	const socketPlayerMap = new Map<string, number>();
	const defaultBlock = language === "en" ? "a" : "다";
	return {
		matchLetter: buildMatchLetterForLanguage(block ?? defaultBlock, language),
		status: "waiting",
		players: players,
		turn: 0,
		connectedPlayers: 0,
		usedWords: [],
		timerDuration,
		socketPlayerMap: socketPlayerMap,
	};
}

export function makePlayersArray<T extends PlayersArray>(): T {
	return Array(MAX_PLAYERS).fill(null) as T;
}

export function clonePlayersArray(cloneFrom: PlayersArray): PlayersArray {
	const cloneArray = makePlayersArray();
	cloneFrom.forEach((v, i) => {
		cloneArray[i] = v === null ? null : { ...v };
	});
	return cloneArray;
}

export function isRequiredGameState(state: GameState): state is Required<GameStateFrozen> {
	try {
		assertIsRequiredGameState(state);
		return true;
	} catch (err) {
		console.warn("isRequiredGameState guard failed", err);
		return false;
	}
}

export function toGameStateEmit(state: GameState): GameStateEmit {
	let { thisPlayer, socketPlayerMap, ...stateEmit } = state;
	stateEmit.players = cloneServerPlayersToClientPlayers(stateEmit.players as ServerPlayers); // hacky
	return stateEmit;
}

export function fromEmitToGameStateClient(
	emitState: GameStateEmit,
	args: Pick<GameStateClient, Exclude<keyof GameStateClient, keyof GameStateEmit>>
): GameStateClient {
	const defaults = {
		submitting: false
	}
	return {
		...emitState,
		...defaults,
		...args,
	}
}

// export function toGameStateClient(state: GameState): GameStateClient {
//     /**
//      * Requires that state.thisPlayer is defined.
//      * Removes the socketPlayerMap from the state.
//      * This function is used to convert a GameStateServer to a GameStateClient.
//      * It is used to send the game state to the client.
//      * @param state 
//      * @returns 
//      */
//     // const thisPlayer = state.thisPlayer;
//     // if (thisPlayer === undefined) throw new Error("thisPlayer cannot be undefined here");
//     const { socketPlayerMap, thisPlayer, ...clientState } = state;
//     return clientState;
//     // return {
//     //     ...rest,
//     //     // thisPlayer: thisPlayer,
//     // };
// }

export function toGameStateServer(state: GameState): GameStateServer {
	const socketPlayerMap = state.socketPlayerMap;
	if (socketPlayerMap === undefined) throw new SocketPlayerMapUndefinedError();
	const { thisPlayer, ...rest } = state;
	return {
		...rest,
		socketPlayerMap: socketPlayerMap,
	};
}

/**
 * Resolves clientId to the player's seat index.
 * @param state - The game state
 * @param clientId - The socket client ID
 * @returns The seat number, or false if not found
 */
export function socketToSeat(state: GameState, clientId: string): number | false {
	const playerSeat = state.socketPlayerMap?.get(clientId);
	return playerSeat !== undefined ? playerSeat : false;
}

/**
 * Gets the player object for a given clientId.
 * @param state - The game state
 * @param clientId - The socket client ID
 * @returns The player with ID, or null if not found
 */
export function getPlayerByClientId(state: GameState, clientId: string): PlayerWithId | null {
	const seat = socketToSeat(state, clientId);
	if (seat === false) return null;
	const player = state.players[seat];
	if (!player || !("uid" in player) || !player.uid) return null;
	return player as PlayerWithId;
}

function findAvailableSeat(state: GameState): number {
	const availableI = state.players.findIndex((v) => v === null);
	if (availableI < 0) {
		console.error("state.players.findIndex((v) => v === null); == < 0");
		console.error(state.players);
		throw new NoAvailableSeatError();
	}
	return availableI;
}

function insertPlayerIntoArray<T extends PlayersArray>(players: T, player: PlayerWithId, seat: number): T {
	if (seat < 0 || seat >= players.length) {
		throw new SeatIndexOutOfBoundsError(seat);
	}
	const updatedPlayers = clonePlayersArray(players);
	updatedPlayers[seat] = { ...player, seat: seat };
	return updatedPlayers as T;
}

export type { GameState };
