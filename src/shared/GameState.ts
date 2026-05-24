/***
Notes from gpt:
- no mutations / side effects in the reducer
- Reducers must always return state; implment default for switch/case
- use simple objects rather than classes (Player type vs Player class)
***/

import { ActionDispatch } from "react";
import { MAX_PLAYERS } from "./consts";
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
} from "./errors";
import { assertIsRequiredGameState, assertIsRequiredPlayerWithId } from "./guards";
import { GameState, GameStateClient, GameStateEmit, GameStateFrozen, GameStateServer, GameStatus, Player, PlayersArray, PlayerWithId, ServerPlayers } from "./types";
import { buildMatchLetterForLanguage, cloneServerPlayersToClientPlayers, turnToPlayerIndex, pp, getCurrentTurnPlayer, getAlivePlayerCount } from "./utils";

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
    // Player Registration & Array Management
    // ========================================
    registerPlayer,
    addPlayer,
    addPlayerToArray,
    removePlayer,

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

    while ((!nextTurnPlayer || nextTurnPlayer.health <= 0) && maxLoops < MAX_PLAYERS + 1) {
        nextState = nextTurn(nextState);
        nextTurnPlayer = getCurrentTurnPlayer(nextState);
        maxLoops++;
    }

    if (maxLoops >= MAX_PLAYERS + 1) {
        throw new CannotProgressTurnError();
    }

    return nextState;
}

export function endGame(currentState?: GameState): GameState {
    const loser = currentState?.thisPlayer;
    if (!loser) throw new ThisPlayerUndefinedError();
    const nextState: GameState = {
        ...currentState,
        status: "finished"
    };
    return toGameStateEmit(nextState);
};

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

    const nextState: GameState = { ...state };
    
    // If `thisPlayer` is in the state value, update its health
    const updateThisPlayer = nextState.thisPlayer && nextState.thisPlayer.seat == playerSeat;

    const player = nextState.players[playerSeat];
    if (!player) throw new PlayerNotFoundError(`No player found at seat ${playerSeat} in players: ${JSON.stringify(nextState.players)}`);

    player.health = newHealth;

    if (updateThisPlayer) {
        nextState.thisPlayer!.health = newHealth;
    }

    return nextState;
}

// ========================================
// Player Registration & Array Management
// ========================================
function _postPlayerCountUpdateState(state: GameState): GameState {
    /**
     * This function will update values which depend on the number of players connected to the game.
     */
    const connectedPlayers = state.players.filter((p) => p != null).length;
    let status = state.status;

    if (connectedPlayers === 0) {
        status = "waiting";
    } else if (connectedPlayers < 2) {
        // One player in the lobby — never auto-switch to "playing" (only `startGame` does that).
        if (status !== "playing" && status !== "finished") {
            status = "waiting";
        }
    }
    // With 2+ players, keep status as-is: "waiting" until the host starts, or "playing"/"finished" if already set.

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
    const updatedPlayers = insertPlayerIntoArray(state.players, player, seat);
    const newPlayer = updatedPlayers[seat];
    if (newPlayer === null) throw new NewPlayerNullError();
    assertIsRequiredPlayerWithId(newPlayer);
    const nextState = _postPlayerCountUpdateState({ ...state, players: updatedPlayers, thisPlayer: newPlayer });

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
    const updatedPlayers = insertPlayerIntoArray(state.players, player, seat);
    const nextState = _postPlayerCountUpdateState({ ...state, players: updatedPlayers });
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

    const nextState = _postPlayerCountUpdateState({
        ...state,
        players: updatedPlayers
    });

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
    const updatedPlayers = clonePlayersArray(state.players);
    updatedPlayers[playerId] = null;
    // TODO: Remove player from map!!
    const playerUid = player.uid;
    if (playerUid === undefined) throw new PlayerUidUndefinedError();
    state.socketPlayerMap?.delete(playerUid);

    const nextState = _postPlayerCountUpdateState({ ...state, players: updatedPlayers });

    return {
        ...nextState,
    };
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
    return newState;
}

export function gameStateUpdateClient(newState: GameStateEmit, currentState?: GameStateClient): GameStateClient {
    if (!currentState) throw new CurrentStateRequiredError();
    let p  = newState.players[currentState.thisPlayer.seat ?? -1];
    p = {...currentState.thisPlayer, ... (p || {})};
    return {
        ...newState,
        thisPlayer: {...currentState.thisPlayer, ... (p || {})}
    };
}

// =============================================================================
// REDUCER
// =============================================================================
export function gameStateReducer<T>(state: T, action: GameStateActionsType): T {

    if (!Object.keys(GameStateActions).includes(action.type)) {
        throw new UnknownActionTypeError(action.type);
    }

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
    language: "en" | "ko" = "ko"
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
    const seatFromMap = socketToSeat(state, clientId);
    if (seatFromMap !== false) {
        const player = state.players[seatFromMap];
        if (player && "uid" in player && player.uid === clientId) {
            return player as PlayerWithId;
        }
    }
    for (let i = 0; i < state.players.length; i++) {
        const p = state.players[i];
        if (p && "uid" in p && p.uid === clientId) {
            return p as PlayerWithId;
        }
    }
    return null;
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

