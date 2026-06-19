import { GameStateDispatch } from "@/shared/GameState";
import { GameStateClient, GameStateEmit } from "@/shared/types";
import { shouldEndGameOnPlayerDeath } from "@/shared/utils";
import { logger } from "@/lib/client/logging";

const L = "word-submit";

export type SubmitWordResponse =
	| { success: true; gameState: GameStateEmit }
	| { success: false; reason: string; gameState?: GameStateEmit };

/**
 * This function is ran after the player submits a word to the server, and gets a response.
 * @param response
 * @param word
 */
export function submitWordCallback(
	gameState: GameStateClient,
	dispatch: GameStateDispatch,
	setInputError: (error: boolean, message?: string) => void,
	response: SubmitWordResponse,
	word: string,
) {
	logger.info(L, "submitWordCallback", { word, success: response.success, reason: !response.success ? response.reason : undefined });
	if (response.success) {
		return correctWord(gameState, dispatch, response.gameState, word);
	} else {
		return wrongWord(
			gameState,
			dispatch,
			response.gameState ?? null,
			setInputError,
			response.reason,
		);
	}
}

export function correctWord(
	gameState: GameStateClient,
	dispatch: GameStateDispatch,
	responseGameState: GameStateEmit,
	word: string,
) {
	const state = { ...responseGameState, thisPlayer: gameState.thisPlayer };
	if (gameState.thisPlayer) {
		return {
			type: "custom",
			payload: [
				state,
				[
					"setPlayerLastWord",
					"gameStateUpdateClient"
				],
				[
					[word],
					[state]
				]
			]
		};
	} else {
		return {
			type: "custom",
			payload: [
				responseGameState,
				[
					"gameStateUpdateClient"
				],
				[
					[state]
				]
			]
		};
	}
	// const patchedState = responseGameState;

	// if (gameState.thisPlayer) {
	//     dispatch({
	//         type: "setPlayerLastWord",
	//         payload: [
	//             { ...patchedState, thisPlayer: gameState.thisPlayer },
	//             word,
	//         ],
	//     });
	// }

	// console.log(
	//     `[correctWord] dispatching gameStateUpdateClient` +
	//     ` newTurn=${patchedState.turn} oldTurn=${gameState.turn}` +
	//     ` newStatus=${patchedState.status}` +
	//     ` currentSubmitting=${gameState.submitting}` +
	//     ` (will become undefined since GameStateEmit lacks submitting field)`,
	// );

	// dispatch({
	//     type: "gameStateUpdateClient",
	//     payload: [patchedState],
	// });
}

export function wrongWord(
	gameState: GameStateClient,
	dispatch: GameStateDispatch,
	responseGameState: null | GameStateEmit,
	setInputError: (error: boolean, message?: string) => void,
	reason: string | undefined,
) {
	setInputError(true, reason);

	if (responseGameState) {
		// if the server has ended the game (i.e. because other players died, or this player died.)
		return {
			type: "custom",
			payload: [
				responseGameState,
				[
					"gameStateUpdateClient"
				],
				[
					[gameState]
				]
			]
		}
		// dispatch({
		//     type: "gameStateUpdateClient",
		//     payload: [responseGameState],
		// });
		// return;
	}

	const health = gameState.thisPlayer.health;
	const seat = gameState.thisPlayer.seat!;
	if (shouldEndGameOnPlayerDeath(gameState, health)) {
		// dispatch({
		//     type: "decreasePlayerHealth",
		//     payload: [gameState, health, seat],
		// });
		// dispatch({
		//     type: "endGame",
		//     payload: [],
		// });
		return {
			type: "custom",
			payload: [
				gameState,
				[
					"decreasePlayerHealth",
					"endGame"
				],
				[
					[health, seat],
					[]
				]
			]
		}
	} else {
		return {
			type: "custom",
			payload: [
				gameState,
				[
					"decreasePlayerHealth",
				],
				[
					[health, seat],
				]
			]
		}
	}
}
