import { buildInitialGameState, GameState } from "../shared/GameState";
import { ServerPlayers } from "../shared/types";

let gameState = buildInitialGameState({server:true});

export function getGameState() {
    return gameState;
}

export function setGameState(state: GameState<ServerPlayers>) {
    gameState = state;
}