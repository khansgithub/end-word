import { MAX_PLAYERS } from "../../server/consts";
import { FixedLengthArray, PairToObject, PlayerProfile, TupleToObject } from "../../server/types";
import { Player } from "../classes";
import { buildSyllableSteps } from "../hangul-decomposer";
import { MatchLetter } from "./InputFieldUtil";

type GameState = {
    matchLetter: MatchLetter,
    players: FixedLengthArray<Player | null, typeof MAX_PLAYERS>
    connectedPlayers: number
    turn: number,
}

type GameStateActions =
    | { type: "buildMatchLetter", payload: Parameters<typeof buildMatchLetter> }
    | { type: "nextTurn", payload: PairToObject<Parameters<typeof nextTurn>> }
    | { type: "playerJoin", payload: PairToObject<Parameters<typeof playerJoin>> }
    | { type: "setLastWord", payload: string }
// | {type: "progressNextTurn", payload: Parameters<typeof buildMatchLetter>
// TupleToObject<Parameters<typeof buildMatchLetter>>
// & {lastWord: string}
// & TupleToObject<Parameters<typeof nextTurn>>
// }

type GameStateActionsBatch =
    {
        type: "progressNextTurn",
        payload: Extract<GameStateActions, { type: "buildMatchLetter" }>["payload"]
        // payload: PairToObject<["block", string]>
    }

function nextTurn({ currentTurn }: { currentTurn: number }): number {
    return currentTurn++;
}

function playerJoin(params: {players: Player[], profile: PlayerProfile}): [number, Player] {
    const availableI = params.players.findIndex((v, i) => v == null);
    if (availableI === undefined) {
        throw new Error("unexpected error");
    }
    const newPlayer = new Player(params.profile.name, "");
    return [availableI, newPlayer];
    // return {
    //     players: state.players
    // }
}

function setLastWord(params: {state: GameState, lastWord: string}): Player {
    const [state, lastWord] = [params.state, params.lastWord];
    const player = state.players[state.turn];
    state.players[state.turn].lastWord = lastWord;
    return player
    // return {
    //     players: state.players
    // };
}

function buildMatchLetter({block}: {block: string}): MatchLetter {
    if (block.length > 1) throw new Error("Must be 1 syllable");
    const arr = buildSyllableSteps(block);
    return {
        block: block,
        steps: [...arr],
        value: block,
        next: 0
    };
}

export function initialGameState(): GameState {
    return {
        matchLetter: buildMatchLetter("가"),
        players: Array.from({ length: MAX_PLAYERS }, _ => null) as FixedLengthArray<null, typeof MAX_PLAYERS>,
        turn: 0,
        connectedPlayers: 0,
    }
}

export function gameStateReducer(state: GameState, action: Partial<GameStateActions | GameStateActionsBatch>): GameState {
    switch (action.type) {
        case ("buildMatchLetter"):
            return {
                ...state,
                matchLetter: buildMatchLetter(action.)
            }
        case ("nextTurn"):
            return {
                ...state,
                turn: nextTurn(...action.payload)
            }
        case ("playerJoin"):
            {
                const updatedPlayers = [...state.players] as typeof state.players;
                const [newPlayerI, newPlayer] = playerJoin(...action.payload);
                updatedPlayers[newPlayerI] = newPlayer;
                return {
                    ...state,
                    players: updatedPlayers
                }
            }
        case ("setLastWord"):
            {
                const updatedPlayers = [...state.players] as typeof state.players;
                updatedPlayers[state.turn].lastWord = action.payload;
                return {
                    ...state,
                    players: updatedPlayers
                }
            }
        default:
            console.error("GameReducer default");
    }
}