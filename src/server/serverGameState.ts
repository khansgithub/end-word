import { buildInitialGameState, GameState } from "../shared/GameState";

let gameState = buildInitialGameState();

export function getGameState() {
    return gameState;
}

export function setGameState(state: GameState) {
    gameState = state;
}