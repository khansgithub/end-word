/***
Notes from gpt:
- no mutations / side effects in the reducer
- Reducers must always return state; implment default for switch/case
- use simple objects rather than classes (Player type vs Player class)
***/

import { MAX_PLAYERS } from "./consts";
import { assertIsRequiredGameState, assertIsRequiredPlayerWithId } from "./guards";
import { ClientPlayers, GameState, GameStateClient, GameStateEmit, GameStateFrozen, GameStateServer, GameStatus, Player, PlayersArray, PlayerWithId, ServerPlayers } from "./types";
import { buildMatchLetter, cloneServerPlayersToClientPlayers, getCurrentPlayerIndex, pp } from "./utils";

export type GameStateActionsType = {
    [K in keyof typeof GameStateActions]:
    {
        type: K
        payload: Parameters<typeof GameStateActions[K]>
    }
}[keyof typeof GameStateActions];


// can't most of these just be one function which is passed "update data"? 
// okay the keys here should not be the same the socket events, that makes things confusing
// name them exactly as what they do to the data
// =============================================================================
// REDUCER MAP
// =============================================================================


const GameStateActions = {
    nextTurn,
    setPlayerLastWord,
    // fullUpdateGameState,
    registerPlayer,
    addPlayer,
    addPlayerToArray,
    removePlayer,
    progressNextTurn,
    updateConnectedPlayersCount,
    replaceGameState, // remove
    gameStateUpdateClient,
} satisfies { [key: string]: (...args: any[]) => GameState };

// =============================================================================
// REDUCER FUNCTIONS
// =============================================================================

export function replaceGameState(newState: GameState, currentState?: GameState): GameState {
    return newState;
}

export function gameStateUpdateClient(newState: GameStateEmit, currentState?: GameStateClient): GameStateClient {
    if (!currentState) throw new Error("currentState needs to be passed");
    return {
        ...newState,
        thisPlayer: currentState.thisPlayer
    };
}

export function updateConnectedPlayersCount(state: GameState, count: number, currentState?: GameState): GameState {
    return {
        ...state,
        connectedPlayers: count
    }
}

export function nextTurn(state: GameState, currentState?: GameState): GameState {
    return {
        ...state,
        turn: state.turn + 1,
    };
}

function _postPlayerCountUpdateState(state: GameState): GameState {
    /**
     * This function will update values which depend on the number of players connected to the game.
     */
    const connectedPlayers = state.players.filter((p) => p != null).length;
    const status: GameStatus = connectedPlayers >= 2 ? "playing" : "waiting";
    return {
        ...state,
        connectedPlayers: connectedPlayers,
        status: status
    };
}

export function removePlayer(
    state: GameState,
    player: Player,
    currentState?: GameState
): GameState {
    const playerId = player.seat;
    if (playerId === undefined) {
        throw new Error("unexpected error");
    }

    // const updatedPlayers = state.players.slice();
    const updatedPlayers = clonePlayersArray(state.players);
    updatedPlayers[playerId] = null;
    // TODO: Remove player from map!!
    const playerUid = player.uid;
    if (playerUid === undefined) throw new Error("unexpected error");
    state.socketPlayerMap?.delete(playerUid);

    const nextState = _postPlayerCountUpdateState({ ...state, players: updatedPlayers });

    return {
        ...nextState,
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
    if (newPlayer === null) throw new Error("newPlayer cannot be null here");
    assertIsRequiredPlayerWithId(newPlayer);
    const nextState = _postPlayerCountUpdateState({ ...state, players: updatedPlayers, thisPlayer: newPlayer });

    console.log("registerPlayer in Reducer: next state is: ", pp(nextState));

    return nextState
}

export function addPlayerToArray(
    state: GameState,
    player: PlayerWithId,
    currentState?: GameState
): GameState {
    const updatedPlayers = clonePlayersArray(state.players);
    if (player.seat === undefined) throw new Error(`Player ${pp(player)} must have a seat`)
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
        throw new Error("unexpected error");
    }
    const seat = findAvailableSeat(state);
    const updatedPlayers = insertPlayerIntoArray(state.players, player, seat);
    const nextState = _postPlayerCountUpdateState({ ...state, players: updatedPlayers });
    console.log("addPlayer in Reducer: next state is: ", pp(nextState));
    return nextState;
}

export function setPlayerLastWord(
    state: GameState,
    playerLastWord: string,
    currentState?: GameState
): GameState {
    const currentPlayerIndex = getCurrentPlayerIndex(state.turn, state.connectedPlayers);
    const updatedPlayers = clonePlayersArray(state.players);
    const player = updatedPlayers[currentPlayerIndex];

    if (!player) throw new Error("unexpected error");

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

export function progressNextTurn(
    state: GameState,
    block: string,
    playerLastWord: string,
    currentState?: GameState
): GameState {
    let nextState: GameState = state;
    nextState = {
        ...nextState,
        matchLetter: buildMatchLetter(block),
    };
    nextState = setPlayerLastWord(nextState, playerLastWord)
    nextState = nextTurn(nextState);
    return nextState;
}



// =============================================================================
// REDUCER
// =============================================================================
export function gameStateReducer<T>(state: T, action: GameStateActionsType): T {

    if (!Object.keys(GameStateActions).includes(action.type)) {
        throw new Error(`couldn't find ${action.type} in GameStateActions`);
    }

    console.log("in reducer: action > ", action.type);
    // console.log("in reducer: payload > ", action.payload);
    // throw new Error("");

    // idk how to fix the typing issue
    // const f = GameStateActions[action.type] as (state: GameState, ...args: any[]) => GameState;
    const f = GameStateActions[action.type] as (state: GameState, ...args: unknown[]) => GameState;
    const params = action.payload as Parameters<typeof f>;
    return f(...params, state) as T;//ClientOrServerReturn<T>;
}

// =============================================================================
// OTHER FUNCTIONS
// =============================================================================
export function buildInitialGameState(): GameState {
    const players = makePlayersArray<ServerPlayers>();
    const socketPlayerMap = new Map<string, PlayerWithId>();
    return {
        matchLetter: buildMatchLetter("다"),
        status: null,
        players: players,
        turn: 0,
        connectedPlayers: 0,
        socketPlayerMap: socketPlayerMap,
    }
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
    if (socketPlayerMap === undefined) throw new Error("socketPlayerMap cannot be undefined here");
    const { thisPlayer, ...rest } = state;
    return {
        ...rest,
        socketPlayerMap: socketPlayerMap,
    };
}

function findAvailableSeat(state: GameState): number {
    const availableI = state.players.findIndex((v) => v === null);
    if (availableI < 0) {
        console.error("state.players.findIndex((v) => v === null); == < 0");
        console.error(state.players);
        throw new Error("unexpected error");
    }
    return availableI;
}

function insertPlayerIntoArray<T extends PlayersArray>(players: T, player: PlayerWithId, seat: number): T {
    if (seat < 0 || seat >= players.length) {
        throw new Error(`Seat index ${seat} out of bounds`);
    }
    const updatedPlayers = clonePlayersArray(players);
    updatedPlayers[seat] = { ...player, seat: seat };
    return updatedPlayers as T;
}

export type { GameState };

