import { Socket } from "socket.io";
import { Socket as SocketClient } from "socket.io-client";
import { MAX_PLAYERS } from "./consts";
import type { SocketEventName, socketEvents, SocketEvents } from "./socketEvents";
import { EventsMap } from "socket.io/dist/typed-events";

/* --------------------------------------------------
 * Utility Types
 * -------------------------------------------------- */

export type FixedLengthArray<T, L extends number> = T[] & { length: L };

/* --------------------------------------------------
 * Player Types
 * -------------------------------------------------- */

export type Player = {
    uid?: string;
    seat?: number
    name: string;
    lastWord?: string;
};

export type PlayersArray = FixedLengthArray<Player | null, typeof MAX_PLAYERS>;

/* --------------------------------------------------
 * Socket Event Types
 * -------------------------------------------------- */

type EventName<K extends keyof SocketEvents> = SocketEvents[K];
type EventEntry<Name extends keyof SocketEvents, Handler> = {
    [K in EventName<Name>]: Handler;
};

export type SharedSocketEvents = EventsMap &
    EventEntry<"text", (text: string) => void>;

export type ClientToServerEvents = SharedSocketEvents &
    EventEntry<"getPlayerCount", () => void> &
    EventEntry<"registerPlayer", (playerProfile: Player) => void> &
    EventEntry<"unregisterPlayer", (playerProfile: Player) => void>; // maybe this can be just the id?

export type ServerToClientEvents = SharedSocketEvents &
    EventEntry<"playerCount", (count: number) => void> &
    EventEntry<"playerJoinNotification", (newPlayer: Player) => void> &
    EventEntry<"playerLeaveNotification", (player: Player) => void> &
    EventEntry<"playerRegistered", (gameState: Required<GameState>) => void> &
    EventEntry<"playerNotRegistered", (reason: string) => void> &
    EventEntry<"returningPlayer", (player: Player) => void>;

// Compile-time guard: ensure the contract object and the typed events never drift.
type EventNamesFromConst = SocketEventName;
type EventNamesFromTypes =
    | EventName<"connect">
    | EventName<"disconnect">
    | EventName<"text">
    | EventName<"getPlayerCount">
    | EventName<"registerPlayer">
    | EventName<"unregisterPlayer">
    | EventName<"playerCount">
    | EventName<"playerJoinNotification">
    | EventName<"playerLeaveNotification">
    | EventName<"playerRegistered">
    | EventName<"playerNotRegistered">
    | EventName<"returningPlayer">
    | EventName<"isReturningPlayer">;
type Assert<T extends true> = T;
type _SocketEventsAreInSync = Assert<
    EventNamesFromConst extends EventNamesFromTypes
        ? EventNamesFromTypes extends EventNamesFromConst
            ? true
            : false
        : false
>;

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

export type GameState = {
    thisPlayer?: Required<Player>, // optional for the server
    matchLetter: MatchLetter,
    status: GameStatus,
    players: PlayersArray
    connectedPlayers: number
    turn: number,
};

export type GameStateFrozen = Readonly<GameState>
