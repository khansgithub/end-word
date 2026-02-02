import { Socket } from "socket.io";
import { Socket as SocketClient } from "socket.io-client";
import { MAX_PLAYERS } from "./consts";
import { SocketEventName } from "./socket";

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
export type AckSubmitWordResponseParams = { success: true; gameState: GameStateEmit } | { success: false; reason: string };
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
};

/**
 * Compile-time guard: if any typed event name isn't present in socketEvents, this assignment fails.
 */
type AllTypedSocketEvents = keyof (ClientToServerEvents & ServerToClientEvents);
type AssertAllTypedEventsExistInSocketEvents = Exclude<AllTypedSocketEvents, SocketEventName> extends never ? true : false;
export const socketEventSyncCheck: AssertAllTypedEventsExistInSocketEvents = true;

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
export type GameStatus = "waiting" | "playing" | "finished" | null;

export type MatchLetter = {
    block: string
    steps: Array<string>
    value: string
    next: number
}

// export type GameState<T extends PlayersArray = PlayersArray> = {
//     thisPlayer?: Required<PlayerWithId>, // optional for the server
//     matchLetter: MatchLetter,
//     status: GameStatus,
//     players: T,
//     connectedPlayers: number
//     turn: number,
//     socketPlayerMap?: WeakMap<String, Player>, // only on server
// };


export type GameState = {
    thisPlayer?: PlayerWithId,
    matchLetter: MatchLetter,
    status: GameStatus,
    players: PlayersArray,
    connectedPlayers: number
    turn: number,
    // socketPlayerMap?: WeakMap<string, Player>, // only on server - don't really know if using a weakmap is necessary here
    // socketPlayerMap?: Map<string, Player>,
    socketPlayerMap?: Map<string, PlayerWithId>,
}

export type GameStateEmit = (
    Omit<GameState, "thisPlayer" | "socketPlayerMap">
    & {players: ClientPlayers}
);
export type GameStateServer = Omit<GameState, "thisPlayer"> & Required<Pick<GameState, "socketPlayerMap">>;
export type GameStateClient = (
    Omit<GameState, "socketPlayerMap">
    & {thisPlayer: PlayerWithId}
)

export type GameStateFrozen = Readonly<GameState>;
// export type GameStateFrozen = Readonly<GameState<PlayersArray>>
