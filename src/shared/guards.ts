import { GameState, Player } from "./types";

export function assertHasThisPlayer(state: GameState): asserts state is GameState & { thisPlayer: Player } {
  if (!state.thisPlayer) {
    throw new Error("unexpected error");
  }
}
