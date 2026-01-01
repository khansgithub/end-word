// Canonical list of socket event names used by both client and server.
export const socketEvents = {
    connect: "connect",
    disconnect: "disconnect",
    getPlayerCount: "getPlayerCount",
    playerCount: "playerCount",
    playerJoinNotification: "playerJoinNotification",
    playerLeaveNotification: "playerLeaveNotification",
    playerRegistered: "playerRegistered",
    playerNotRegistered: "playerNotRegistered",
    registerPlayer: "registerPlayer",
    unregisterPlayer: "unregisterPlayer",
    isReturningPlayer: "isReturningPlayer",
    returningPlayer: "returningPlayer",
    submitWord: "submitWord",
    gameStateUpdate: "gameStateUpdate",
    requestFullState: "requestFullState",
    fullStateSync: "fullStateSync",
    text: "text",
} as const;

export type SocketEvents = typeof socketEvents;
export type SocketEventName = SocketEvents[keyof SocketEvents];