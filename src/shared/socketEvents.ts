import { arrayToMapped } from "./utils";

// Canonical list of socket event names used by both client and server.
const socketEventsArray = [
    "connect",
    "disconnect",
    "fullStateSync",
    "gameStateUpdate",
    "getPlayerCount",
    "isReturningPlayer",
    "playerCount",
    "playerJoinNotification",
    "playerLeaveNotification",
    "playerNotRegistered",
    "playerRegistered",
    "registerPlayer",
    "requestFullState",
    "returningPlayer",
    "submitWord",
    "text",
    "unregisterPlayer",
] as const;

export type SocketEventName = (typeof socketEventsArray)[number];
export const socketEvents = arrayToMapped(socketEventsArray);