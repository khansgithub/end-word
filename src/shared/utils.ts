import { buildSyllableSteps } from "../app/hangul-decomposer";
import { ClientPlayers, ClientPlayerSocket, MatchLetter, PlayerWithId, PlayerWithoutId, RunExclusive, ServerPlayers } from "./types";
import { DEFAULT_HEALTH } from "./consts";
import { lookUpWord } from "./api";
import { isDictionaryEntry } from "./guards";

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
export function getCurrentPlayerIndex(turn: number, connectedPlayers: number): number {
    return turn % connectedPlayers;
}

/**
 * Checks if it's a specific player's turn.
 *
 * @param gameState - The current game state
 * @param playerSeat - The seat/index of the player to check
 * @returns True if it's the specified player's turn, false otherwise
 */
export function isPlayerTurn(gameState: { turn: number; connectedPlayers: number }, playerSeat: number): boolean {
    return getCurrentPlayerIndex(gameState.turn, gameState.connectedPlayers) === playerSeat;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates if a given input string is a valid word in the dictionary.
 * Makes an API call to check if the word exists in the dictionary.
 *
 * @param input - The word to validate
 * @returns Promise that resolves to true if the word is valid, false otherwise
 * @todo Add debounce to prevent excessive API calls
 * @todo Move API URL to constants
 */
export async function inputIsValid(input: string): Promise<boolean> {
    // console.warn("skipping this for dev purposes");
    // return true
    if (input.length === 0) return false;

    // 1. Dictionary form (ending with '다') is invalid EXCEPT for certain nouns that end in 다, so check only pure verb/adjective patterns.
    // Heuristically, if the input length > 1 and ends with '다', it's likely a verb/adjective and thus should be rejected.
    if (input.length > 1 && input.endsWith("다")) {
        return false;
    }

    // 2. Politeness/formal endings: Disallow a broad range of polite/formal/casual verb endings.
    // "요" as a standalone will match any ending with "요", so entries that are just longer forms
    // ending in "요" are redundant. Only "요" is needed for this kind of filter.
    const politeEndings = [
        "요", "입니다", "니까", "십시오", "읍니다", "습니다"
    ];
    for (const ending of politeEndings) {
        if (input.endsWith(ending)) {
            return false;
        }
    }
    
    // const res = await fetch("http://localhost:8000/lookup/" + input);
    const res = await lookUpWord(input);
    return Object.keys(res).length > 0;
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
        throw new Error("Must be 1 syllable");
    }

    const arr = buildSyllableSteps(block);
    return {
        block,
        steps: [...arr],
        value: block,
        next: 0,
    } satisfies MatchLetter;
}

// ============================================================================
// Environment Utilities
// ============================================================================

/**
 * Returns true if SUPPRESS is set to true.
 */
export function isSuppress(): boolean {
    return String(process.env.SUPPRESS).toLowerCase() === "true";
}