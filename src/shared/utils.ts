import { buildSyllableSteps } from "../app/hangul-decomposer";
import { envGet } from "../server/env";
import { DEFAULT_HEALTH } from "./consts";
import { InvalidSyllableError } from "./errors";
import { ClientPlayers, GameState, MatchLetter, PlayerWithId, PlayerWithoutId, RunExclusive, ServerPlayers } from "./types";

// ============================================================================
// Core Utilities
// ============================================================================

/**
 * Creates a promise-based mutex to serialize state mutations across concurrent socket events.
 * Ensures that async operations are executed sequentially, preventing race conditions.
 *
 * @returns A function that queues async operations to run exclusively
 */
export function createSocketMutex(): RunExclusive {
    let last = Promise.resolve();
    return async fn => {
        last = last.then(fn);
        return last.catch(err => {
            // Reset chain so later calls still run even if one fails
            last = Promise.resolve();
            throw err;
        });
    };
}

/**
 * Pretty-prints an object as formatted JSON string.
 * Useful for debugging and logging.
 *
 * @param obj - The object to stringify
 * @returns Formatted JSON string with tab indentation
 */
export function pp(obj: any): string {
    // if (isSuppress()) return "[SUPPRESS=TRUE]";
    // return "[SUPPRESS=TRUE]";
    return JSON.stringify(obj, null, '\t');
}

// ============================================================================
// Player Utilities
// ============================================================================

/**
 * Creates a new player object without an ID.
 */
export function makeNewPlayer(name: string): PlayerWithoutId;
/**
 * Creates a new player object with an ID.
 */
export function makeNewPlayer(name: string, uid: string): PlayerWithId;
/**
 * Factory function to create a new player object.
 * Can create a player with or without a user ID depending on whether uid is provided.
 *
 * @param name - The player's name
 * @param uid - Optional user ID for the player
 * @returns A player object with or without a uid property
 */
export function makeNewPlayer(name: string, uid?: string): PlayerWithoutId | PlayerWithId {
    const r = { name, lastWord: "", health: DEFAULT_HEALTH };
    return uid === undefined ? r : { ...r, uid };
}

/**
 * Converts server-side player data to client-side player data.
 * Removes the `uid` field from each player object since clients don't need it.
 *
 * @param players - Array of server player objects (may include nulls)
 * @returns Array of client player objects with uid removed
 */
export function cloneServerPlayersToClientPlayers(players: ServerPlayers): ClientPlayers {
    return players.map((player) => {
        if (player == null) return null;
        const { uid: _uid, ...rest } = player;
        return rest;
    }) as ClientPlayers;
}

/**
 * Gets the index of the current player based on the turn number and number of connected players.
 * Uses modulo arithmetic to cycle through players.
 *
 * @param turn - The current turn number
 * @param connectedPlayers - The number of connected players
 * @returns The index of the current player (0-based)
 */
export function turnToPlayerIndex(turn: number, connectedPlayers: number): number {
    return turn % connectedPlayers;
}

/**
 * Get the player whose turn it is.
 */
export function getCurrentTurnPlayer(state: GameState) {
    const playerI = turnToPlayerIndex(state.turn, state.connectedPlayers);
    const player = state.players[playerI];
    return player;
}

export function getAlivePlayerCount(state: GameState): number {
    return state.players.reduce(
        (count, player) =>
            (player && player.health > 0 ? count + 1 : count),
        0);
}

/**
 * Checks if it's a specific player's turn.
 *
 * @param gameState - The current game state
 * @param playerSeat - The seat/index of the player to check
 * @returns True if it's the specified player's turn, false otherwise
 */
export function isPlayerTurn(gameState: { turn: number; connectedPlayers: number }, playerSeat: number): boolean {
    return turnToPlayerIndex(gameState.turn, gameState.connectedPlayers) === playerSeat;
}

// ============================================================================
// Match/Game Utilities
// ============================================================================

/**
 * Builds a MatchLetter object from a single syllable block.
 * Decomposes the syllable into steps for matching logic.
 *
 * @param block - A single syllable string (must be length 1)
 * @returns A MatchLetter object with the syllable and its decomposition steps
 * @throws Error if block length is greater than 1
 */
export function buildMatchLetter(
    block: string
): MatchLetter {
    if (block.length > 1) {
        throw new InvalidSyllableError();
    }

    const arr = buildSyllableSteps(block);
    return {
        block,
        steps: [...arr],
        value: block,
        next: 0,
    } satisfies MatchLetter;
}

/** English: single-letter match (no Hangul decomposition). */
export function buildEnglishMatchLetter(letter: string): MatchLetter {
    const block = letter.toLowerCase().slice(0, 1);
    return {
        block,
        steps: [block],
        value: block,
        next: 0,
    };
}

export function buildMatchLetterForLanguage(
    block: string,
    language: "en" | "ko"
): MatchLetter {
    return language === "en" ? buildEnglishMatchLetter(block) : buildMatchLetter(block);
}

// ============================================================================
// Environment Utilities
// ============================================================================

/**
 * Returns true if SUPPRESS is set to true.
 */
export function isSuppress(): boolean {
    return process.env["SUPPRESS"] === "true";
}


// ============================================================================
// Typing Utilities
// ============================================================================
/**
 * Creates a mapped type from an array of string.
 */
export function arrayToMapped<T extends readonly string[]>(arr: T) {
    return Object.fromEntries(
        arr.map((name) => [name, name])
    ) as { [K in T[number]]: K };
}
