import { AssertionError } from "assert";
import { GameState, Player } from "./types";

export function assertHasThisPlayer(state: GameState): asserts state is GameState & { thisPlayer: Player } {
    if (!state.thisPlayer) {
        throw new Error("unexpected error");
    }
}

export function assertIsConcretePlayer(player: Player): asserts player is Required<Player> {
    const isConcrete = ![player.lastWord, player.seat].includes(undefined);
    if (!isConcrete) throw new AssertionError({message: "Player is expected to be concrete"});
}