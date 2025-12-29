import { AssertionError } from "assert";
import { GameState, GameStateFrozen, Player, PlayerWithId, PlayerWithoutId } from "./types";

function hasPlayerId(player: Player) { return player.uid !== undefined; }

function satisfiesPlayerWithoutId(player: PlayerWithoutId): boolean {
    const requiredPlayer: Required<PlayerWithoutId> = {
        "lastWord": "",
        "name": "",
        "seat": 0,
    };

    Object.keys(requiredPlayer).forEach(k => {
        const v = player[k as keyof typeof player];
        if (v === undefined) return false
    });

    return true;
}

export function assertHasThisPlayer(state: GameState): asserts state is GameState & { thisPlayer: Player } {
    if (!state.thisPlayer) {
        throw new Error("unexpected error");
    }
}

export function assertIsPlayerWithId(player: Player): asserts player is PlayerWithId {
    if (!hasPlayerId(player)) throw new AssertionError({ message: "Player is expected to be PlayerWithId" });
}

export function assertIsPlayerWithoutId(player: Player): asserts player is PlayerWithoutId {
    if (hasPlayerId(player)) throw new AssertionError({ message: "Player is expected to be PlayerWithoutId" });
}

export function assertIsRequiredPlayerWithId(player: PlayerWithId): asserts player is Required<PlayerWithId> {
    assertIsPlayerWithId(player);
    if (!hasPlayerId(player)) throw new AssertionError({ message: `Player is expected to be concrete, missing uid: ${JSON.stringify(player)}` });
}

export function assertIsRequiredPlayerWithoutId(player: PlayerWithoutId): asserts player is Required<PlayerWithoutId> {
    assertIsPlayerWithoutId(player);
    if(!satisfiesPlayerWithoutId(player)) throw new AssertionError({ message: `Player is expected to be concrete, missing some values ${player}` });
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

    assertIsRequiredPlayerWithId(thisPlayer!);
}

export function isRequiredGameState(state: GameState): state is Required<GameState> {
    return state.thisPlayer !== undefined;
}
