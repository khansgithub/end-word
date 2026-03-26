import { DEFAULT_HEALTH, MAX_PLAYERS } from "./consts";

/* --------------------------------------------------
 * Utility Types
 * -------------------------------------------------- */

export type FixedLengthArray<T, L extends number> = T[] & { length: L };

/**
 * Function type for running exclusive async operations.
 * Used to serialize state mutations across concurrent socket events.
 */
export type RunExclusive = (fn: () => Promise<void>) => Promise<void>;


/**
 * Boolean map type.
 * Used to map boolean values to strings.
 */
export type BoolMap = {
    [key in 0 | 1]: BoolMap | string;
};

export type PropertyBoolMap = {
    values: string[];
    map: BoolMap;
};

/* --------------------------------------------------
 * Player Types
 * -------------------------------------------------- */

export type Player = {
    uid?: string;
    seat?: number
    name: string;
    lastWord: string;
    health: typeof DEFAULT_HEALTH;
};

// export type Player = PlayerWithId | PlayerWithoutId;

export type PlayerWithId = Player & Required<Pick<Player, "uid">>;
export type PlayerWithoutId = Omit<Player, "uid">;

// export type ThisPlayer = PlayerWithId;
// export type OtherPlayer = PlayerWithoutId;

export type ClientPlayers = FixedLengthArray<PlayerWithId | PlayerWithoutId | null, typeof MAX_PLAYERS>;
export type ServerPlayers = FixedLengthArray<PlayerWithId | null, typeof MAX_PLAYERS>;
export type PlayersArray = ClientPlayers | ServerPlayers;
// export type PlayersArray = FixedLengthArray<Player | null, typeof MAX_PLAYERS>;


/* --------------------------------------------------
 * Game States
 * -------------------------------------------------- */
export type GameStatus = "waiting" | "playing" | "finished";

export type MatchLetter = {
    block: string
    steps: Array<string>
    value: string
    next: number
}

export type GameState = {
    thisPlayer?: PlayerWithId,
    matchLetter: MatchLetter,
    status: GameStatus,
    players: PlayersArray,
    connectedPlayers: number
    turn: number,
    socketPlayerMap?: Map<string, number>,
}

export type GameStateEmit = (
    Omit<GameState, "thisPlayer" | "socketPlayerMap">
    & { players: ClientPlayers }
);
export type GameStateServer = Omit<GameState, "thisPlayer"> & Required<Pick<GameState, "socketPlayerMap">>;
export type GameStateClient = (
    Omit<GameState, "socketPlayerMap">
    & { thisPlayer: PlayerWithId }
)

export type GameStateFrozen = Readonly<GameState>;
// export type GameStateFrozen = Readonly<GameState<PlayersArray>>

/* --------------------------------------------------
 * API Types
 * -------------------------------------------------- */
export type EntryDataEng = {
    word: string
    definition: string
};

export type DictionaryEntry = {
    key: string
    data: Array<EntryDataEng>
};

export type DictionaryEmptyEntry = {};

export type DictionaryResponse = DictionaryEntry | DictionaryEmptyEntry;
