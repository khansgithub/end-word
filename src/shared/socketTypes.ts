import { DefaultEventsMap, Socket } from "socket.io";
import { Socket as SocketClient } from "socket.io-client";
import { SocketEventName } from "./socketEvents";
import { DictionaryEntry, GameStateEmit, Player, PlayerWithId } from "./types";

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