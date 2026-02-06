// @ts-nocheck
// fix this file

import { ActionDispatch, RefObject } from "react";
import { io } from "socket.io-client";
import { GameStateActionsType } from "../../shared/GameState";
import {
    ClientPlayerSocket as PlayerSocket,
    GameState,
    ServerToClientEvents,
} from "../../shared/types";

type GameStateDispatch = ActionDispatch<[action: GameStateActionsType]>;

export type WebsocketHandlerRefs = {
    socket: RefObject<PlayerSocket>;
    gameState: GameState;
    gameStateUpdate: GameStateDispatch;
};

// Keep the latest state/dispatch so event callbacks (which live outside React) always
// have a fresh reference without re-registering handlers on each render.
const handlerContext: {
    gameState: GameState | null;
    gameStateUpdate: GameStateDispatch | null;
} = {
    gameState: null,
    gameStateUpdate: null,
};

// Prevent duplicate listener registration when React re-renders with the same socket.
const registeredSockets = new WeakSet<PlayerSocket>();

// Stable connection handler references (needed for off()).
const connectionHandlers = {
    connect: () => console.log("WebSocket connected"),
};

// Track per-socket lifecycle handlers so we can unregister cleanly.
const lifecycleHandlers = new WeakMap<PlayerSocket, { disconnect: () => void }>();

/**
 * Create and return a typed socket instance.
 * This wrapper keeps a single point to tweak socket.io config later.
 */
export function getSocketManager(): PlayerSocket {
    return io() as PlayerSocket;
}

/**
 * Attach websocket listeners for the provided socket ref.
 * Safe to call on every render: it no-ops once a socket is wired, but refreshes context.
 */
export function websocketHandler(refs: WebsocketHandlerRefs): void {
    const socketInstance = refs.socket.current;
    handlerContext.gameState = refs.gameState;
    handlerContext.gameStateUpdate = refs.gameStateUpdate;

    if (!socketInstance) {
        console.warn("websocketHandler invoked without an active socket");
        return;
    }

    if (registeredSockets.has(socketInstance)) {
        return;
    }

    socketInstance.on("connect", connectionHandlers.connect);
    const onDisconnect = () => detachAllHandlers(socketInstance);
    socketInstance.on("disconnect", onDisconnect);
    lifecycleHandlers.set(socketInstance, { disconnect: onDisconnect });

    attachAllHandlers(socketInstance);
    registeredSockets.add(socketInstance);
}

// ------------------------------------------------------------
// Server event handlers
// ------------------------------------------------------------

function onPlayerRegistered(nextState: Required<GameState>) {
    handlerContext.gameState = nextState;
    handlerContext.gameStateUpdate?.({
        type: "fullUpdateGameState",
        payload: nextState,
    });
}

function onPlayerNotRegistered(reason: string) {
    console.warn("player registration rejected", { reason });
}

function onPlayerCount(count: number) {
    console.info("connected players", count);
}

function onGameUpdate(update: Partial<GameState>) {
    const currentState = handlerContext.gameState;
    if (!handlerContext.gameStateUpdate || !currentState) {
        return;
    }

    // Merge partial updates from the server with the latest known state.
    const nextState = { ...currentState, ...update } as GameState;
    handlerContext.gameState = nextState;

    handlerContext.gameStateUpdate({
        type: "fullUpdateGameState",
        payload: nextState,
    });
}

function onText(message: string) {
    console.log(`Server: ${message}`);
}

// ------------------------------------------------------------
// Wiring helpers
// ------------------------------------------------------------

type EventHandlerMap = {
    [K in keyof ServerToClientEvents]: ServerToClientEvents[K];
};

const eventHandlers: EventHandlerMap = {
    playerRegistered: onPlayerRegistered,
    playerNotRegistered: onPlayerNotRegistered,
    playerCount: onPlayerCount,
    gameUpdate: onGameUpdate,
    text: onText,
};

function attachAllHandlers(socket: PlayerSocket) {
    (Object.keys(eventHandlers) as Array<keyof ServerToClientEvents>).forEach((event) => {
        socket.on(event, eventHandlers[event]);
    });
}

function detachAllHandlers(socket: PlayerSocket) {
    (Object.keys(eventHandlers) as Array<keyof ServerToClientEvents>).forEach((event) => {
        socket.off(event, eventHandlers[event]);
    });

    socket.off("connect", connectionHandlers.connect);
    const disconnectHandler = lifecycleHandlers.get(socket);
    if (disconnectHandler) {
        socket.off("disconnect", disconnectHandler.disconnect);
        lifecycleHandlers.delete(socket);
    }

    registeredSockets.delete(socket);
}
