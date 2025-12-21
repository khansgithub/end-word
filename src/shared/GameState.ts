/***
Notes from gpt:
- no mutations / side effects in the reducer
- Reducers must always return state; implment default for switch/case
- use simple objects rather than classes (Player type vs Player class)
***/

import { buildSyllableSteps } from "../app/hangul-decomposer";
import { MAX_PLAYERS } from "./consts";
import { GameState, GameStatus, MatchLetter, Player, PlayersArray } from "./types";

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
const GameStateActions = {
    buildMatchLetter,
    nextTurn,
    setPlayerLastWord,
    // fullUpdateGameState,
    addPlayer,
    removePlayer,
    registerPlayer,
    progressNextTurn,
    updateConnectedUsers,
} satisfies { [key: string]: (...args: any[]) => GameState };


function updateConnectedUsers(state: GameState, count: number): GameState{
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

function removePlayer(
    state: GameState,
    profile: Player
): GameState {
    const playerId = profile.playerId;
    if (playerId === undefined) {
        throw new Error("unexpected error");
    }

    const updatedPlayers: PlayersArray = [...state.players] as PlayersArray;
    updatedPlayers[playerId] = null;

    return {
        ...state,
        players: updatedPlayers,
    };
}

function addPlayer(
    state: GameState,
    profile: Player
): GameState {
    const availableI = state.players.findIndex((v) => v == null);
    if (availableI < 0) {
        throw new Error("unexpected error");
    }

    if (!profile.name) {
        throw new Error("unexpected error");
    }

    const newPlayer: Required<Player> = {
        name: profile.name,
        lastWord: "",
        playerId: availableI,
    };

    const updatedPlayers = [...state.players] as PlayersArray;
    updatedPlayers[availableI] = newPlayer;

    const connectedPlayers = updatedPlayers.filter((p) => p != null).length;
    const status: GameStatus = connectedPlayers >= 2 ? "playing" : "waiting";

    return {
        ...state,
        players: updatedPlayers,
        connectedPlayers,
        status,
    };
}

function registerPlayer(state: GameState, player: Player): Required<GameState> {
    let r: GameState;
    r = addPlayer(state, player);
    return {
        ...r,
        thisPlayer: player
    };
}

function setPlayerLastWord(
    state: GameState,
    playerLastWord: string
): GameState {
    const player = state.players[state.turn];
    if (!player) {
        throw new Error("unexpected error");
    }

    const updatedPlayers: PlayersArray = [...state.players] as PlayersArray;
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
    var state: GameState;
    state = buildMatchLetter(state, block);
    state = setPlayerLastWord(state, playerLastWord)
    state = nextTurn(state);
    return state;
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


export function buildInitialGameState(playerName?: string, playerI?: number): GameState {
    const players = Array(MAX_PLAYERS).fill(null) as PlayersArray;
    if (playerI !== undefined && playerName !== undefined) {
        const player: Player = {
            name: playerName,
        }
        players[playerI] = player;
    }

    return {
        matchLetter: buildMatchLetter({} as any as GameState, "가").matchLetter,
        status: null,
        players: players,
        turn: 0,
        connectedPlayers: 0,
    }
}

type ClientOrServerReturn<T> = T extends Required<GameState> ? T : GameState;
export function gameStateReducer<T extends GameState>(state: T, action: GameStateActionsType): ClientOrServerReturn<T> {
    var r: GameState;
    action
    switch (action.type) {
        case ("buildMatchLetter"):
            r = buildMatchLetter(...action.payload)
            break;
        case ("nextTurn"):
            r = nextTurn(...action.payload)
            break;
        case ("playerJoin"):
            r = addPlayer(...action.payload);
            break;
        case ("setPlayerLastWord"):
            r = setPlayerLastWord(...action.payload);
            break;
        case ("progressNextTurn"):
            r = progressNextTurn(...action.payload);
            break;
        // case ("fullUpdateGameState"):
        //     r = action.payload[0].state
        //     break;
        case ("playerLeave"):
            r = playerLeave(...action.payload);
            break;
        default:
            console.error("GameReducer default", action);
            r = state
            break;
    }
    return r as ClientOrServerReturn<T>;
}
