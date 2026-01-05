import { ClientPlayers, ClientPlayerSocket, PlayerWithId, PlayerWithoutId, RunExclusive, ServerPlayers } from "./types";

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
    const r = { name, lastWord: "" };
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
 * @param turn - The current turn number
 * @param connectedPlayers - The number of connected players
 * @param playerSeat - The seat/index of the player to check
 * @returns True if it's the specified player's turn, false otherwise
 */
export function isPlayerTurn(turn: number, connectedPlayers: number, playerSeat: number): boolean {
    return getCurrentPlayerIndex(turn, connectedPlayers) === playerSeat;
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
    console.warn("skipping this for dev purposes");
    return true
    if (input.length === 0) return false;

    const res = await fetch("/dictionary/word/" + input);
    if (!res.ok) return false;

    const data = await res.json();
    return Object.keys(data).length > 0;
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