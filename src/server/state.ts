import { GameState } from "../shared/GameState";
import { GameStateNotInitializedError } from "../shared/errors";

let gameState: GameState | null = null;

export function getGameState(): GameState {
    if (gameState === null) throw new GameStateNotInitializedError();
    return gameState;
}

export function setGameState(state: GameState) {
    console.log("Setting game state", state);
    gameState = state;
}