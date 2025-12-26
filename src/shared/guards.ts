import { AssertionError } from "assert";
import { GameState, GameStateFrozen, Player } from "./types";

export function assertHasThisPlayer(state: GameState): asserts state is GameState & { thisPlayer: Player } {
    if (!state.thisPlayer) {
        throw new Error("unexpected error");
    }
}

export function assertIsConcretePlayer(player: Player): asserts player is Required<Player> {
    const isConcrete = ![player.lastWord, player.seat, player.uid].includes(undefined);
    if (!isConcrete) throw new AssertionError({ message: "Player is expected to be concrete" });
}

export function assertIsRequiredGameState(state: GameState): asserts state is Required<GameStateFrozen> {
    const { matchLetter, status, players, connectedPlayers, turn, thisPlayer } = state;
    const fields = [matchLetter, status, players, connectedPlayers, turn, thisPlayer];
    if (fields.includes(undefined)) {
        throw new AssertionError({
            message: `GameState is missing required fields:
            ${JSON.stringify(Object.entries(state))}`
        });
    }

    assertIsConcretePlayer(thisPlayer!);
}

