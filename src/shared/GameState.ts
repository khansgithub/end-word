/***
Notes from gpt:
- no mutations / side effects in the reducer
- Reducers must always return state; implment default for switch/case
- use simple objects rather than classes (Player type vs Player class)
***/

import { buildSyllableSteps } from "../app/hangul-decomposer";
import { MAX_PLAYERS } from "./consts";
import { assertIsRequiredGameState, assertIsRequiredPlayerWithId } from "./guards";
import { ClientPlayers, GameState, GameStateFrozen, GameStatus, Player, PlayersArray, PlayerWithId, PlayerWithoutId, ServerPlayers } from "./types";
import { pp } from "./utils";

export type GameStateActionsType = {
    [K in keyof typeof GameStateActions]:
    {
        type: K
        payload: Parameters<typeof GameStateActions[K]>
    }
}[keyof typeof GameStateActions];

type ClientOrServerReturn<T> = T extends Required<GameState> ? T : GameState;

// can't most of these just be one function which is passed "update data"? 
// okay the keys here should not be the same the socket events, that makes things confusing
// name them exactly as what they do to the data
// =============================================================================
// REDUCER MAP
// =============================================================================
const GameStateActions = {
    buildMatchLetter,
    nextTurn,
    setPlayerLastWord,
    // fullUpdateGameState,
    registerPlayer,
    addPlayer,
    addAndRegisterPlayer,
    removePlayer,
    progressNextTurn,
    updateConnectedPlayersCount,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies { [key: string]: (...args: any[]) => GameState };

// =============================================================================
// REDUCER FUNCTIONS
// =============================================================================
function updateConnectedPlayersCount(state: GameState, count: number): GameState {
    return {
        ...state,
        connectedPlayers: count
    }
}

function nextTurn(state: GameState): GameState {
    return {
        ...state,
        turn: state.turn + 1,
    };
}

function _postPlayerCountUpdateState(state: GameState): GameState{
    /**
     * This function will update values which depend on the number of players connected to the game.
     */
    const players = state.players;
    const connectedPlayers = players.filter((p) => p != null).length;
    const status: GameStatus = connectedPlayers >= 2 ? "playing" : "waiting";
    return {
        ...state,
        connectedPlayers: connectedPlayers,
        status: status
    };
}

function removePlayer(
    state: GameState,
    profile: Player
): GameState {
    const playerId = profile.seat;
    if (playerId === undefined) {
        throw new Error("unexpected error");
    }

    // const updatedPlayers = state.players.slice();
    const updatedPlayers = clonePlayersArray<typeof state.players>(state.players);
    updatedPlayers[playerId] = null;

    const nextState = _postPlayerCountUpdateState({...state, players: updatedPlayers});

    return {
        ...nextState,
    };
}

function registerPlayer(
    state: GameState,
    player: PlayerWithId
): GameState {
    assertIsRequiredPlayerWithId(player);
    return {...state, thisPlayer: player}
}

function addPlayer(
    state: GameState,
    player: Player,
): GameState {

    const availableI = state.players.findIndex((v) => v === null);

    if (availableI < 0) {
        console.error("state.players.findIndex((v) => v === null); == < 0");
        console.error(state.players);
        throw new Error("unexpected error");
    }

    if (!player.name) {
        console.error("addPlayer: profile.name is undefined")
        throw new Error("unexpected error");
    }

    const updatedPlayers = clonePlayersArray(state.players);
    
    let playerToAdd: Player = {
            name: player.name,
            lastWord: "",
            seat: availableI,
            uid: undefined,
    };

    if (state.thisPlayer){
        playerToAdd.uid = state.thisPlayer.uid;
    } else {
        delete playerToAdd.uid;
    }

    updatedPlayers[availableI] = playerToAdd;
    
    const nextState = _postPlayerCountUpdateState({...state, players: updatedPlayers});

    return nextState;
}

function addAndRegisterPlayer(
    state: GameState,
    player: PlayerWithId
): GameState {
    return registerPlayer(addPlayer(state, player), player);
}

function setPlayerLastWord(
    state: GameState,
    playerLastWord: string
): GameState {
    const player = state.players[state.turn];
    if (!player) {
        throw new Error("unexpected error");
    }

    const updatedPlayers = clonePlayersArray<typeof state.players>(state.players);
    updatedPlayers[state.turn] = {
        ...player,
        lastWord: playerLastWord,
    };

    return {
        ...state,
        players: updatedPlayers,
    };
}

function progressNextTurn(state: GameState, block: string, playerLastWord: string) {
    let nextState: GameState = state;
    nextState = buildMatchLetter(nextState, block);
    nextState = setPlayerLastWord(nextState, playerLastWord)
    nextState = nextTurn(nextState);
    return nextState;
}

function buildMatchLetter(
    state: GameState,
    block: string
): GameState {
    if (block.length > 1) {
        throw new Error("Must be 1 syllable");
    }

    const arr = buildSyllableSteps(block);

    return {
        ...state,
        matchLetter: {
            block,
            steps: [...arr],
            value: block,
            next: 0,
        },
    };
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
    return f(...params) as T;//ClientOrServerReturn<T>;
}

// =============================================================================
// OTHER FUNCTIONS
// =============================================================================
export function buildInitialGameState(options: { server: true }): GameState<ServerPlayers>;
export function buildInitialGameState(options?: { server?: false }): GameState<ClientPlayers>;
export function buildInitialGameState(options: { server?: boolean } = {}): GameState  {
    const { server = false } = options;
    const players = server ? makePlayersArray<ServerPlayers>() : makePlayersArray<ClientPlayers>();
    const emptyGameState = {} as unknown as GameState;
    return {
        matchLetter: buildMatchLetter(emptyGameState, "가").matchLetter,
        status: null,
        players: players,
        turn: 0,
        connectedPlayers: 0,
    }
}

export function makePlayersArray<T extends PlayersArray>(): T {
    return Array(MAX_PLAYERS).fill(null) as T;
}

export function clonePlayersArray<T extends PlayersArray>(cloneFrom: T): T{
    const cloneArray = makePlayersArray<T>();
    cloneFrom.forEach((v, i) => cloneArray[i] = v);
    return cloneFrom;
}

export function isRequiredGameState(state: GameState): state is Required<GameStateFrozen>{
    try {
        assertIsRequiredGameState(state);
        return true;
    } catch (err) {
        console.warn("isRequiredGameState guard failed", err);
        return false;
    }
}

export type { GameState };

