/***
Notes from gpt:
- no mutations / side effects in the reducer
- Reducers must always return state; implment default for switch/case
- use simple objects rather than classes (Player type vs Player class)
***/

import { buildSyllableSteps } from "../app/hangul-decomposer";
import { MAX_PLAYERS } from "./consts";
import { MatchLetter, Player, PlayersArray } from "./types";

export type GameState = {
    // Tracks the expected Hangul block + its decomposition steps + current step index
    // Example:
    //   block: "각"
    //   steps: ["ㄱ", "가", "각"]
    //   next: 1 (next step the user must type)
    thisPlayerId: number | null,
    matchLetter: MatchLetter,
    players: PlayersArray
    connectedPlayers: number
    turn: number,
}

export type GameStateActions =
    | { type: "buildMatchLetter", payload: Parameters<typeof buildMatchLetter>[0] }
    | { type: "nextTurn", payload: Parameters<typeof nextTurn>[0] }
    | { type: "playerJoin", payload: Parameters<typeof playerJoin>[0] }
    | { type: "setPlayerLastWord", payload: Parameters<typeof setPlayerLastWord>[0] }


export type GameStateActionsBatch =
    {
        type: "progressNextTurn",
        payload:
        & Extract<GameStateActions, { type: "buildMatchLetter" }>["payload"]
        & Extract<GameStateActions, { type: "setPlayerLastWord" }>["payload"]
        & Extract<GameStateActions, { type: "nextTurn" }>["payload"]
    }

function nextTurn({ currentTurn }: { currentTurn: number }): number {
    return currentTurn + 1;
}

function playerJoin(params: { players: Player[], profile: Player }): [number, Player] {
    const availableI = params.players.findIndex((v, i) => v === undefined);
    if (availableI < 0) {
        throw new Error("unexpected error");
    }
    if (!params.profile.name) {
        throw new Error("unexpected error")
    }
    const newPlayer: Player = { name: params.profile.name, lastWord: "" };
    return [availableI, newPlayer];
}

function setPlayerLastWord(params: { player: Player, playerLastWord: string }): Player {
    const player: Player = { name: params.player.name, lastWord: params.playerLastWord };
    return player;
}

function buildMatchLetter({ block }: { block: string }): MatchLetter {
    if (block.length > 1) throw new Error("Must be 1 syllable");
    const arr = buildSyllableSteps(block);
    return {
        block: block,
        steps: [...arr],
        value: block,
        next: 0
    };
}

export function buildInitialGameState(playerName?: string, playerI?: number): GameState {
    const players = Array(MAX_PLAYERS).fill(null) as PlayersArray;
    if (playerI !== undefined && playerName !== undefined) {
        players[playerI] = {
            name: playerName,
            lastWord: ""
        };
    }

    return {
        thisPlayerId: null,
        matchLetter: buildMatchLetter({ block: "가" }),
        players: players,
        turn: 0,
        connectedPlayers: 0,
    }
}


export function gameStateReducer(state: GameState, action: GameStateActions | GameStateActionsBatch): GameState {
    switch (action.type) {
        case ("buildMatchLetter"):
            return {
                ...state,
                matchLetter: buildMatchLetter(action.payload)
            }
        case ("nextTurn"):
            return {
                ...state,
                turn: nextTurn(action.payload)
            }
        case ("playerJoin"):
            {
                const updatedPlayers = [...state.players] as typeof state.players;
                const [newPlayerI, newPlayer] = playerJoin(action.payload);
                updatedPlayers[newPlayerI] = newPlayer;
                return {
                    ...state,
                    players: updatedPlayers
                }
            }
        case ("setPlayerLastWord"):
            {
                const updatedPlayer = setPlayerLastWord(action.payload)
                const updatedPlayers = [...state.players] as typeof state.players;
                updatedPlayers[state.turn] = updatedPlayer;
                return {
                    ...state,
                    players: updatedPlayers
                }
            }
        case ("progressNextTurn"):
            {
                const matchLetter = buildMatchLetter({ block: action.payload.block });
                const updatedPlayers = [...state.players] as typeof state.players;
                const currentPlayer = updatedPlayers[state.turn];
                if (!currentPlayer) throw new Error("unexpected error");
                updatedPlayers[state.turn] = setPlayerLastWord(
                    { player: currentPlayer, playerLastWord: action.payload.playerLastWord })
                const updatedTurn = nextTurn({ currentTurn: action.payload.currentTurn });
                return {
                    ...state,
                    matchLetter: matchLetter,
                    players: updatedPlayers,
                    turn: updatedTurn
                }
            }
        default:
            console.error("GameReducer default");
            return state
    }
}