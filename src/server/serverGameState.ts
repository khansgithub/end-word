import { GameState } from "../shared/GameState";

let gameState: GameState | null = null;

export function getGameState(): GameState {
    if (gameState === null) throw new Error("Game state not initialized");
    return gameState;
}

export function setGameState(state: GameState) {
    console.log("Setting game state", state);
    gameState = state;
}