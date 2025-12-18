/***
Notes from gpt:
- no mutations / side effects in the reducer
- Reducers must always return state; implment default for switch/case
- use simple objects rather than classes (Player type vs Player class)
***/

import { buildSyllableSteps } from "../app/hangul-decomposer";
import { MAX_PLAYERS } from "./consts";
import { GameState, GameStatus, MatchLetter, Player, PlayersArray } from "./types";

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

function playerJoin(params: { players: PlayersArray, profile: Player }): [number, Player] {
    const availableI = params.players.findIndex((v) => v == null);
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
        const player: Player = {
            name: playerName,
        }
        players[playerI] = player;
    }

    return {
        matchLetter: buildMatchLetter({ block: "가" }),
        status: "waiting",
        players: players,
        turn: 0,
        connectedPlayers: 0,
    }
}

type ClientOrServerReturn<T> = T extends Required<GameState> ? T : GameState;
export function gameStateReducer<T extends GameState>(state: T, action: GameStateActions | GameStateActionsBatch): ClientOrServerReturn<T> {
    var r: T;
    switch (action.type) {
        case ("buildMatchLetter"):
           r = {
                ...state,
                matchLetter: buildMatchLetter(action.payload)
            }
            break;
        case ("nextTurn"):
            r = {
                ...state,
                turn: nextTurn(action.payload)
            }
            break;
        case ("playerJoin"):
            {
                const updatedPlayers = [...state.players] as typeof state.players;
                const [newPlayerI, newPlayer] = playerJoin(action.payload);
                updatedPlayers[newPlayerI] = newPlayer;
                const connectedPlayers = updatedPlayers.filter((p) => p != null).length;
                const status: GameStatus = connectedPlayers >= 2 ? "playing" : "waiting";
                r = {
                    ...state,
                    players: updatedPlayers,
                    connectedPlayers,
                    status,
                }
            }
            break;
        case ("setPlayerLastWord"):
            {
                const updatedPlayer = setPlayerLastWord(action.payload)
                const updatedPlayers = [...state.players] as typeof state.players;
                updatedPlayers[state.turn] = updatedPlayer;
                r = {
                    ...state,
                    players: updatedPlayers
                }
            }
            break;
        case ("progressNextTurn"):
            {
                const matchLetter = buildMatchLetter({ block: action.payload.block });
                const updatedPlayers = [...state.players] as typeof state.players;
                const currentPlayer = updatedPlayers[state.turn];
                if (!currentPlayer) throw new Error("unexpected error");
                updatedPlayers[state.turn] = setPlayerLastWord(
                    { player: currentPlayer, playerLastWord: action.payload.playerLastWord })
                const updatedTurn = nextTurn({ currentTurn: action.payload.currentTurn });
                r = {
                    ...state,
                    matchLetter: matchLetter,
                    players: updatedPlayers,
                    turn: updatedTurn
                }
            }
            break;
        default:
            console.error("GameReducer default");
            r = state
            break;
    }
    return r as ClientOrServerReturn<T>;
}
