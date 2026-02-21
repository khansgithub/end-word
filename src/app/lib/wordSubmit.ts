import { GameStateActionsType, GameStateDispatch } from "../../shared/GameState";
import { AckSubmitWordResponseParams, GameStateClient, GameStateEmit, PlayerWithId } from "../../shared/types";

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
    response: AckSubmitWordResponseParams,
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
    reason: string,
) {
    if (responseGameState) {
        let _player = responseGameState.players[gameState.thisPlayer.seat!]!;
        _player = { ...gameState.thisPlayer, ..._player };

        dispatch({
            type: "gameStateUpdateClient",
            payload: [responseGameState],
        });
    } else {
        dispatch({
            type: "decreasePlayerHealth",
            payload: [gameState, gameState.thisPlayer.health, gameState.thisPlayer.seat!],
        });
    }
    
    setInputError(true);
    error(L, "submitWord failed", reason);

    // if (gameState.thisPlayer.health == 1) {

    //     // TODO: show game over screen
    //     dispatch({
    //         type: "endGame",
    //         payload: []
    //     });

    // } else {
    //     dispatch({
    //         type: "decreasePlayerHealth",
    //         payload: [gameState, gameState.thisPlayer.health, gameState.thisPlayer.seat!],
    //     });
    //     setInputError(true);
    //     error(L, "submitWord failed", reason);
    // }
}
