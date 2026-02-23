/**
 * Server socket context: shared state and utilities for Socket.IO connections.
 * Holds the active context singleton, used by handlers and test endpoints.
 */
import { Server as SocketServer } from "socket.io";
import { GameStateNotInitializedError } from "../shared/errors";
import {
    type GameState,
    type PlayerWithId,
    type RunExclusive,
} from "../shared/types";
import { createSocketMutex } from "../shared/utils";
import { getGameState } from "./state";

type PlayerUid = Exclude<PlayerWithId["uid"], undefined>;

/** Shared context for socket handlers: state, mutex, registrations, and optional instrumentation. */
export type ServerSocketContext = {
    state: GameState;
    runExclusive: RunExclusive;
    registeredSockets: Map<PlayerUid, Required<PlayerWithId>>;
    io?: SocketServer; // Socket.IO server instance for broadcasting
    stats: {
        getPlayerCount: number;
        connections: number;
    };
    instrumentation?: {
        countEvent: (event: string) => void;
        setRegisteredClients: (count: number) => void;
    };
};

let activeServerContext: ServerSocketContext | null = null;

/** Returns the active context. Throws if not yet initialized (e.g. before first connection). */
export function getServerSocketContext(): ServerSocketContext | null {
    if (activeServerContext === null) {
        console.error("Server socket context has not been initialized");
        return null;
    }
    return activeServerContext;
}

/** Sets the active context. Called when the IO server is created. */
export function setActiveServerContext(ctx: ServerSocketContext): void {
    activeServerContext = ctx;
}

/** Creates a new context from the current game state. Requires game state to be initialized. */
export function createServerSocketContext(
    initialState?: GameState,
    instrumentation?: ServerSocketContext["instrumentation"],
    io?: SocketServer
): ServerSocketContext {
    const gameState = getGameState();
    if (!gameState) {
        throw new GameStateNotInitializedError();
    }
    return {
        state: initialState ?? gameState,
        runExclusive: createSocketMutex(),
        registeredSockets: new Map<PlayerUid, Required<PlayerWithId>>(),
        io,
        stats: {
            getPlayerCount: 0,
            connections: 0,
        },
        instrumentation,
    };
}
