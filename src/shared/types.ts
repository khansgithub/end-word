import { Socket } from "socket.io";
import { Socket as SocketClient } from "socket.io-client";
import { MAX_PLAYERS } from "./consts";
import { SocketEventName } from "./socket";
import { EventsMap } from "socket.io/dist/typed-events";

/* --------------------------------------------------
 * Utility Types
 * -------------------------------------------------- */

export type FixedLengthArray<T, L extends number> = T[] & { length: L };

/**
 * Function type for running exclusive async operations.
 * Used to serialize state mutations across concurrent socket events.
 */
export type RunExclusive = (fn: () => Promise<void>) => Promise<void>;

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

export type ClientToServerEvents = SharedSocketEvents & {
    getPlayerCount: () => void;
    registerPlayer: (playerProfile: PlayerWithId) => void;
    unregisterPlayer: (playerProfile: PlayerWithId) => void; // maybe this can be just the id?
    isReturningPlayer: (clientId: string) => void;
    submitWord: (word: string) => void;
    requestFullState: () => void;
    disconnect: (reason: string) => void;
};

export type ServerToClientEvents = SharedSocketEvents & {
    playerCount: (count: number) => void;
    playerJoinNotification: (newPlayer: PlayerWithoutId) => void;
    playerLeaveNotification: (player: PlayerWithoutId) => void;
    playerRegistered: (gameState: Required<GameState<ClientPlayers>>) => void;
    playerNotRegistered: (reason: string) => void;
    returningPlayer: (player: PlayerWithId) => void;
    gameStateUpdate: (gameState: Required<GameState<ClientPlayers>>) => void;
    fullStateSync: (gameState: Required<GameState<ClientPlayers>>) => void;
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

export type GameState<T extends PlayersArray = PlayersArray> = {
    thisPlayer?: Required<PlayerWithId>, // optional for the server
    matchLetter: MatchLetter,
    status: GameStatus,
    players: T,
    connectedPlayers: number
    turn: number,
};

export type GameStateFrozen = Readonly<GameState<PlayersArray>>
