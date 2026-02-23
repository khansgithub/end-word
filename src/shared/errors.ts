/**
 * Custom error classes for the application.
 * Use these instead of generic Error for better error handling and debugging.
 *
 * Errors marked as `unexpected: true` represent programming bugs or invariant
 * violations that should never occur in normal operation. Use this to:
 * - Prioritize in error monitoring
 * - Show generic "something went wrong" to users vs. specific messages
 * - Distinguish recoverable vs. unrecoverable failures
 *
 * Pass `context` to attach scope values for debugging (e.g. variables, state).
 * Useful for unexpected errors. Serialize with JSON.stringify for logging.
 */

/** Base error class that all custom errors extend. */
export class AppError extends Error {
    /** True if this error represents an invariant violation or logic bug (should never happen). */
    public readonly unexpected: boolean;

    /** Optional context from the scope where the error occurred (e.g. { clientId, state }). */
    public readonly context?: Record<string, unknown>;

    constructor(
        message: string,
        public readonly code?: string,
        unexpected = false,
        context?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;
        this.unexpected = unexpected;
        this.context = context;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/** Type guard: returns true if the error is an AppError marked as unexpected. */
export function isUnexpectedError(err: unknown): err is AppError & { unexpected: true } {
    return err instanceof AppError && err.unexpected === true;
}

/** Serialize error with context for logging. Falls back if context has circular refs. */
export function serializeErrorForLog(err: AppError): string {
    const { message, name, code, unexpected, context } = err;
    const payload = { name, message, code, unexpected, context };
    try {
        return JSON.stringify(payload);
    } catch {
        return `${name}: ${message}${context ? ` (context keys: ${Object.keys(context).join(", ")})` : ""}`;
    }
}

// =============================================================================
// Server / Infrastructure
// =============================================================================

export class ServerContextNotSetupError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("Server context is not set up", "SERVER_CONTEXT_NOT_SETUP", true, context);
    }
}

export class GameStateNotInitializedError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("Game state is not initialized", "GAME_STATE_NOT_INITIALIZED", true, context);
    }
}

// =============================================================================
// Dictionary / API
// =============================================================================

export class DictionaryUrlNotSetError extends AppError {
    constructor() {
        super("Dictionary URL is not set", "DICTIONARY_URL_NOT_SET");
    }
}

export class InvalidDictionaryResponseError extends AppError {
    constructor() {
        super("Dictionary response is invalid", "INVALID_DICTIONARY_RESPONSE");
    }
}

export class DictionaryLookupFailedError extends AppError {
    constructor(word: string, context?: Record<string, unknown>) {
        super(`Failed to lookup word: ${word}`, "DICTIONARY_LOOKUP_FAILED", false, context);
    }
}

export class DictionaryRandomWordFailedError extends AppError {
    constructor() {
        super("Failed to get random word from dictionary", "DICTIONARY_RANDOM_WORD_FAILED");
    }
}

// =============================================================================
// Player / Game State
// =============================================================================

export class PlayerUndefinedError extends AppError {
    constructor(details?: string, context?: Record<string, unknown>) {
        super(details ?? "Player is undefined", "PLAYER_UNDEFINED", true, context);
    }
}

export class ThisPlayerUndefinedError extends AppError {
    constructor(details?: string, context?: Record<string, unknown>) {
        super(details ?? "thisPlayer is undefined", "THIS_PLAYER_UNDEFINED", true, context);
    }
}

export class SeatNotAssignedError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("Seat must be assigned before adding to socketPlayerMap", "SEAT_NOT_ASSIGNED", true, context);
    }
}

export class PlayerNotFoundError extends AppError {
    constructor(details: string, context?: Record<string, unknown>) {
        super(details, "PLAYER_NOT_FOUND", true, context);
    }
}

export class NewPlayerNullError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("newPlayer must not be null", "NEW_PLAYER_NULL", true, context);
    }
}

export class PlayerMustHaveSeatError extends AppError {
    constructor(playerDescription: string, context?: Record<string, unknown>) {
        super(`Player ${playerDescription} must have a seat`, "PLAYER_MUST_HAVE_SEAT", true, context);
    }
}

export class SocketPlayerMapUndefinedError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("socketPlayerMap is undefined", "SOCKET_PLAYER_MAP_UNDEFINED", true, context);
    }
}

export class CurrentStateRequiredError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("currentState is required", "CURRENT_STATE_REQUIRED", true, context);
    }
}

export class UnknownActionTypeError extends AppError {
    constructor(actionType: string, context?: Record<string, unknown>) {
        super(`Unknown action type: ${actionType}`, "UNKNOWN_ACTION_TYPE", true, context);
    }
}

export class SeatIndexOutOfBoundsError extends AppError {
    constructor(seat: number, context?: Record<string, unknown>) {
        super(`Seat index ${seat} is out of bounds`, "SEAT_INDEX_OUT_OF_BOUNDS", true, context);
    }
}

export class HealthInvalidError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("Health must be greater than or equal to 0", "HEALTH_INVALID", true, context);
    }
}

export class GameStatusInvalidError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("Game status must be 'playing'", "GAME_STATUS_INVALID", true, context);
    }
}

export class CannotProgressTurnError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("Cannot progress turn", "CANNOT_PROGRESS_TURN", true, context);
    }
}

export class NoAvailableSeatError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("No available seat", "NO_AVAILABLE_SEAT", true, context);
    }
}

export class PlayerNameMissingError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("Player name is missing", "PLAYER_NAME_MISSING", true, context);
    }
}

export class PlayerUidUndefinedError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("Player UID is undefined", "PLAYER_UID_UNDEFINED", true, context);
    }
}

export class GameStateHasNoThisPlayerError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super("Game state has no thisPlayer", "GAME_STATE_HAS_NO_THIS_PLAYER", true, context);
    }
}

// =============================================================================
// Socket / Connection
// =============================================================================

export class ClientIdRequiredError extends AppError {
    constructor() {
        super("Client ID is required for initial socket connection", "CLIENT_ID_REQUIRED");
    }
}

export class SocketUnavailableError extends AppError {
    constructor(details?: string, context?: Record<string, unknown>) {
        super(details ?? "Socket is unavailable", "SOCKET_UNAVAILABLE", true, context);
    }
}

// =============================================================================
// Validation / Data
// =============================================================================

export class NullValueError extends AppError {
    constructor(details?: string, context?: Record<string, unknown>) {
        super(details ?? "Value is null", "NULL_VALUE", true, context);
    }
}

export class UnexpectedActionTypeError extends AppError {
    constructor(actionType: string, context?: Record<string, unknown>) {
        super(`Unexpected action type: ${actionType}`, "UNEXPECTED_ACTION_TYPE", true, context);
    }
}

export class InvalidSyllableError extends AppError {
    constructor() {
        super("Block must be a single syllable", "INVALID_SYLLABLE");
    }
}

export class LookupBoolMapError extends AppError {
    constructor(map: unknown, bools: unknown) {
        super(
            `lookupBoolMap failed: ${JSON.stringify(map)} ${bools}`,
            "LOOKUP_BOOL_MAP",
            true
        );
    }
}

export class NoWinnerFoundError extends AppError {
    constructor(context?: Record<string, unknown>) {
        super(
            "No player with health > 0 found in state.players",
            "NO_WINNER_FOUND",
            true,
            context
        );
    }
}

export class UnexpectedConnectionStateError extends AppError {
    constructor(state: unknown, context?: Record<string, unknown>) {
        super(`Unexpected connection state: ${state}`, "UNEXPECTED_CONNECTION_STATE", true, context);
    }
}

// =============================================================================
// Mock / Test Data
// =============================================================================

export class MockDataNotLoadedError extends AppError {
    constructor() {
        super("Mock data is not loaded", "MOCK_DATA_NOT_LOADED");
    }
}

export class MockDataParseError extends AppError {
    constructor() {
        super("Mock data was not parsed correctly", "MOCK_DATA_PARSE_ERROR");
    }
}

// =============================================================================
// Test / E2E
// =============================================================================

export class TestEnvError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, "TEST_ENV", false, context);
    }
}

export class E2ETestAssertionError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, "E2E_TEST_ASSERTION", false, context);
    }
}

// =============================================================================
// ERRORS REQUIRING CALLER-PROVIDED MESSAGES (cannot fully standardize)
// =============================================================================
// - PlayerNotFoundError(details)     - Call site builds message; GameState.ts
// - TestEnvError(message)           - E2E env validation; room-flow.spec.ts
// - E2ETestAssertionError(message)  - E2E test assertions; room-flow.spec.ts
// Ensure call sites use: Sentence case, no trailing period
