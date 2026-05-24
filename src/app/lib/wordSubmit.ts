import { GameStateDispatch } from "@/shared/GameState";
import { GameStateClient, GameStateEmit } from "@/shared/types";
import { shouldEndGameOnPlayerDeath } from "@/shared/utils";

export type SubmitWordResponse =
  | { success: true; gameState: GameStateEmit }
  | { success: false; reason: string; gameState?: GameStateEmit };

const L = `${__filename}: `
const log = console.log;
const error = console.error;

/**
 * This function is ran after the player submits a word to the server, and gets a response.
 * @param response 
 * @param word 
 */
export function submitWordCallback(
    gameState: GameStateClient,
    dispatch: GameStateDispatch,
    setInputError: (error: boolean) => void,
    response: SubmitWordResponse,
    word: string) {
    log(L, "submitWord response", response);
    if (response.success) {
        correctWord(
            gameState,
            dispatch,
            response.gameState,
            word
        );
    } else {
        wrongWord(
            gameState,
            dispatch,
            response.gameState ?? null,
            setInputError,
            response.reason
        );
    }
}

export function correctWord(
    gameState: GameStateClient,
    dispatch: GameStateDispatch,
    responseGameState: GameStateEmit,
    word: string,
) {
    if (gameState.thisPlayer) {
        // avoid race by passing in the response state here
        dispatch({
            type: "setPlayerLastWord",
            payload: [{ ...responseGameState, thisPlayer: gameState.thisPlayer }, word],
        });
    }

    dispatch({
        type: "gameStateUpdateClient",
        payload: [responseGameState],
    });
}

export function wrongWord(
    gameState: GameStateClient,
    dispatch: GameStateDispatch,
    responseGameState: null | GameStateEmit,
    setInputError: (error: boolean) => void,
    reason: string | undefined,
) {
    if (responseGameState) {
        dispatch({
            type: "gameStateUpdateClient",
            payload: [responseGameState],
        });
        return;
    }

    const health = gameState.thisPlayer.health;
    const seat = gameState.thisPlayer.seat!;
    if (shouldEndGameOnPlayerDeath(gameState, health)) {
        dispatch({
            type: "decreasePlayerHealth",
            payload: [gameState, health, seat],
        });
        dispatch({
            type: "endGame",
            payload: [],
        });
    } else {
        dispatch({
            type: "decreasePlayerHealth",
            payload: [gameState, health, seat],
        });
    }
}
