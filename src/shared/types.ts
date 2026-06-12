import { DefaultEventsMap, Socket } from "socket.io";
import { Socket as SocketClient } from "socket.io-client";
import { DEFAULT_HEALTH, MAX_PLAYERS } from "@/shared/consts";
import { SocketEventName } from "@/shared/socketEvents";

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
	timeRemaining?: number;
	/** Set when the player leaves mid-game; seat stays occupied for the roster. */
	left?: boolean;
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
 * Socket Event Types
 * -------------------------------------------------- */

export type SharedSocketEvents = {
	text: (text: string) => void;
};

// Acknowledgement function types
export type AckGetPlayerCount = (count: number) => void;
export type AckRegisterPlayerResponse =
	| { success: true; gameState: GameStateEmit, player: PlayerWithId }
	| { success: false; reason: string };

export type AckRegisterPlayer = (response: AckRegisterPlayerResponse) => void;
export type AckUnregisterPlayer = (response: { success: boolean }) => void;
export type AckIsReturningPlayer = (response: { found: boolean; player?: PlayerWithId }) => void;
export type AckSubmitWordResponseParams =
	| { success: true; gameState: GameStateEmit }
	| { success: false; reason: string; gameState?: GameStateEmit };
export type AckSubmitWordResponse = (response: AckSubmitWordResponseParams) => void;
export type AckRequestFullState = (gameState: GameStateEmit) => void;

export type ClientToServerEvents = SharedSocketEvents & {
	getPlayerCount: (ack: AckGetPlayerCount) => void;
	registerPlayer: (playerProfile: PlayerWithId, ack: AckRegisterPlayer) => void;
	unregisterPlayer: (playerProfile: PlayerWithId, ack: AckUnregisterPlayer) => void; // maybe this can be just the id?
	isReturningPlayer: (clientId: string, ack: AckIsReturningPlayer) => void;
	submitWord: (word: string, ack: AckSubmitWordResponse) => void;
	requestFullState: (ack: AckRequestFullState) => void;
	disconnect: (reason: string) => void;
};


export type ServerToClientEvents = SharedSocketEvents & {
	gameStateUpdate: (gameState: GameStateEmit) => void;
	wordDefinition: (definition: DictionaryEntry) => void;
};

/**
 * Compile-time guard: typed events and socketEvents must stay in sync both ways.
 * - Fails if a typed event isn't in socketEvents.ts (error shows missing event names)
 * - Fails if a socketEvent isn't in the types (error shows untyped event names)
 * Add event names to SocketEventsExcludedFromTypes to allow socketEvents without type definitions.
 */
type AllTypedSocketEvents = keyof (ClientToServerEvents & ServerToClientEvents);
type SocketEventsExcludedFromTypes = "connect"; // Socket.IO built-in
type MissingFromSocketEvents = Exclude<AllTypedSocketEvents, SocketEventName>;
type MissingFromTypes = Exclude<SocketEventName, AllTypedSocketEvents | SocketEventsExcludedFromTypes>;
type AssertTypedInSocketEvents = [MissingFromSocketEvents] extends [never] ? true : MissingFromSocketEvents;
type AssertSocketEventsInTypes = [MissingFromTypes] extends [never] ? true : MissingFromTypes;
export const socketEventSyncCheck: [AssertTypedInSocketEvents, AssertSocketEventsInTypes] = [true, true];

/* --------------------------------------------------
 * Socket Types
 * -------------------------------------------------- */

export type SocketProperties = {
	profile?: Player;
};

export type ServerPlayerSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketProperties>;
export type ClientPlayerSocket = SocketClient<ServerToClientEvents, ClientToServerEvents>;

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

export type GameLanguage = "en" | "ko";

export type GameState = {
	thisPlayer?: PlayerWithId,
	matchLetter: MatchLetter,
	status: GameStatus,
	players: PlayersArray,
	connectedPlayers: number
	turn: number,
	/** Normalized words already submitted successfully in this match. */
	usedWords: string[],
	language?: GameLanguage,
	timerDuration: number,
	socketPlayerMap?: Map<string, number>,
}

export type GameStateEmit = (
	Omit<GameState, "thisPlayer" | "socketPlayerMap">
	& { players: ClientPlayers }
);
export type GameStateServer = Omit<GameState, "thisPlayer"> & Required<Pick<GameState, "socketPlayerMap">>;
export type GameStateClient = (
	Omit<GameState, "socketPlayerMap">
	& {
		thisPlayer: PlayerWithId,
		submitting?: boolean,
	}
)

export type GameStateFrozen = Readonly<GameState>;
// export type GameStateFrozen = Readonly<GameState<PlayersArray>>

/* --------------------------------------------------
 * API Types
 * -------------------------------------------------- */
export type EntryDataEng = {
	word: string
	definition: string
	koreanDefinition?: string | null
	koreanDefinitionUrl?: string | null
};

export type DictionaryEntry = {
	key: string
	data: Array<EntryDataEng>
};

export type DictionaryEmptyEntry = {};

export type DictionaryResponse = DictionaryEntry | DictionaryEmptyEntry;

export type Dictionary = {
	lookup: (word: string) => Promise<DictionaryEntry | null>;
	isValidWord: (word: string) => Promise<boolean>;
	lastMatchLetter: (word: string) => Promise<string>;
	randomWord: () => Promise<string>;
}

export type SubmitResult =
	| { success: true; gameState: GameStateEmit; definition: DictionaryEntry }
	| { success: false; reason: string; gameState?: GameStateEmit };
