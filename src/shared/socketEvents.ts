import { arrayToMapped } from "./utils";

// Canonical list of socket event names used by both client and server.
const socketEventsArray = [
    "connect",
    "disconnect",
    "gameStateUpdate",
    "getPlayerCount",
    "isReturningPlayer",
    "registerPlayer",
    "requestFullState",
    "submitWord",
    "text",
    "unregisterPlayer",
    "wordDefinition",
] as const;

export type SocketEventName = (typeof socketEventsArray)[number];
export const socketEvents = arrayToMapped(socketEventsArray);