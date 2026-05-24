import { AssertionError } from "assert";
import { GameStateHasNoThisPlayerError } from "@/shared/errors";
import { BoolMap, DictionaryEntry, DictionaryResponse, GameState, GameStateClient, GameStateFrozen, GameStateServer, Player, PlayerWithId, PlayerWithoutId } from "@/shared/types";

/* --------------------------------------------------
 * Internal Helper Functions
 * -------------------------------------------------- */

function hasPlayerId(player: Player): boolean {
    return player.uid !== undefined;
}

function satisfiesPlayerWithoutId(player: PlayerWithoutId): boolean {
    const requiredFields: (keyof Required<PlayerWithoutId>)[] = ["lastWord", "name", "seat"];
    
    for (const field of requiredFields) {
        if (player[field] === undefined) {
            return false;
        }
    }
    
    return true;
}

/* --------------------------------------------------
 * Player Type Guards & Assertions
 * -------------------------------------------------- */

export function assertIsPlayerWithId(player: Player): asserts player is PlayerWithId {
    if (!hasPlayerId(player)) {
        throw new AssertionError({ message: "Player is expected to be PlayerWithId" });
    }
}

export function assertIsPlayerWithoutId(player: Player): asserts player is PlayerWithoutId {
    if (hasPlayerId(player)) {
        throw new AssertionError({ message: "Player is expected to be PlayerWithoutId" });
    }
}

export function assertIsRequiredPlayerWithId(player: Player): asserts player is Required<PlayerWithId> {
    assertIsPlayerWithId(player);
    if (!hasPlayerId(player)) {
        throw new AssertionError({ 
            message: `Player is expected to be concrete, missing uid: ${JSON.stringify(player)}` 
        });
    }
}

export function assertIsRequiredPlayerWithoutId(player: PlayerWithoutId): asserts player is Required<PlayerWithoutId> {
    assertIsPlayerWithoutId(player);
    if (!satisfiesPlayerWithoutId(player)) {
        throw new AssertionError({ 
            message: `Player is expected to be concrete, missing some values: ${JSON.stringify(player)}` 
        });
    }
}

/* --------------------------------------------------
 * GameState Type Guards & Assertions
 * -------------------------------------------------- */

export function assertHasThisPlayer(state: GameState): asserts state is GameState & { thisPlayer: Player } {
    if (!state.thisPlayer) {
        throw new GameStateHasNoThisPlayerError();
    }
}

export function assertIsRequiredGameState(state: GameState): asserts state is Required<GameStateFrozen> {
    const { matchLetter, status, players, connectedPlayers, turn, thisPlayer } = state;
    const fields = [matchLetter, status, players, connectedPlayers, turn, thisPlayer];
    
    if (fields.includes(undefined)) {
        throw new AssertionError({
            message: `GameState is missing required fields: ${JSON.stringify(Object.entries(state))}`
        });
    }

    assertIsRequiredPlayerWithId(thisPlayer!);
}

export function assertIsGameStateClient(state: GameState): asserts state is GameStateClient {
    if (!(state as GameStateClient).thisPlayer) {
        throw new AssertionError({ 
            message: "GameState is expected to be GameStateClient, missing thisPlayer" 
        });
    }
    if ((state as GameStateServer).socketPlayerMap !== undefined) {
        throw new AssertionError({ 
            message: "GameState is expected to be GameStateClient, should not have socketPlayerMap" 
        });
    }
}

export function isRequiredGameState(state: GameState): state is Required<GameState> {
    return state.thisPlayer !== undefined;
}

/* --------------------------------------------------
 * Other Type Guards
 * -------------------------------------------------- */

export function isBoolMap(value: any): value is BoolMap {
    // TODO: ugly hack lol
    return typeof value === 'object';
}

export function isDictionaryEntry(value: unknown): value is DictionaryEntry {
    if (value == null || typeof value !== 'object') {
        return false;
    }
    return 'key' in value && 'data' in value;
}

export function isDictionaryResponse(value: unknown): value is DictionaryResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        (isDictionaryEntry(value as object) || Object.keys(value as object).length === 0)
    );
}