
import { Server as SocketServer } from "socket.io";
import { buildInitialGameState } from "./GameState";
import { socketEvents } from "./socket";
import {
    type GameState,
    type PlayerWithId,
    type ServerPlayers,
    type ServerPlayerSocket,
    RunExclusive,
} from "./types";
import { createSocketMutex } from "./utils";
import { SocketHandlers, HandlerDependencies } from "./socketHandlers";

type PlayerUid = Exclude<PlayerWithId["uid"], undefined>;

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
    logs: Array<{ ts: number; msg: string }>;
};

export function createServerSocketContext(
    initialState?: GameState,
    instrumentation?: ServerSocketContext["instrumentation"],
    io?: SocketServer
): ServerSocketContext {
    return {
        state: initialState ?? buildInitialGameState(),
        runExclusive: createSocketMutex(),
        registeredSockets: new Map<PlayerUid, Required<PlayerWithId>>(),
        io,
        stats: {
            getPlayerCount: 0,
            connections: 0,
        },
        instrumentation,
        logs: [],
    };
}

// ===================================================================
// SERVER SOCKET EVENT HANDLER
// ===================================================================
export function createServerConnectionHandler(context: ServerSocketContext) {
    const { runExclusive, registeredSockets, stats } = context; // shared amongst all connections
    const countEvent = context.instrumentation?.countEvent ?? (() => { });
    
    const metrics = {
        countEvent,
        setRegisteredClients: context.instrumentation?.setRegisteredClients ?? (() => { }),
        incrementConnections: () => { stats.connections += 1; },
        incrementGetPlayerCountRequests: () => { stats.getPlayerCount += 1; },
        recordGetPlayerCountRequest: () => {
            metrics.incrementGetPlayerCountRequests();
            try {
                metrics.countEvent("getPlayerCount");
            } catch (err) {
                console.warn("countEvent failed for getPlayerCount", err);
            }
        },
    };

    let state = context.state;

    const getState = () => state;
    function setState(nextState: GameState) {
        state = nextState;
        context.state = nextState;
    }

    // Create dependencies object and handlers instance
    const deps: HandlerDependencies = {
        context,
        getState,
        setState,
        registeredSockets,
        runExclusive,
        socketServer: context.io,
        metrics,
    };

    const handlers = new SocketHandlers(deps);

    // ===================================================================
    // EVENT HANDLER REGISTRATION 
    // ===================================================================
    function handler(socket: ServerPlayerSocket) {
        console.log(`[socket] Client connected id=${socket.id} auth=${JSON.stringify(socket.handshake.auth)}`);
        metrics.incrementConnections();
        metrics.countEvent("connect");

        /*
        * ===================================================================
        * DISCONNECT HANDLER
        * ===================================================================
        */
        handlers.registerWithMutex(socket, socketEvents.disconnect, (reason) => 
            handlers.handleDisconnect(socket, reason)
        );

        socket.on(socketEvents.text, (text: string) => {
            console.log("text", text);
            console.log(`Text from client: ${text}`);
        });

        /*
        * ===================================================================
        * GET PLAYER COUNT HANDLER
        * ===================================================================
        */
        handlers.registerWithMutex(socket, socketEvents.getPlayerCount, async () => {
            handlers.handleGetPlayerCount(socket);
        });

        /*
        * ===================================================================
        * REGISTER PLAYER HANDLER
        * ===================================================================
        */
        handlers.registerWithMutex(socket, socketEvents.registerPlayer, (player) => {
            handlers.handleRegisterPlayer(socket, player);
        });

        /*
        * ===================================================================
        * RETURNING PLAYER HANDLER
        * ===================================================================
        */
        handlers.registerWithMutex(socket, socketEvents.isReturningPlayer, async (clientId) => {
            handlers.handleIsReturningPlayer(socket, clientId);
        });

        /*
        * ===================================================================
        * WORD SUBMISSION HANDLER
        * ===================================================================
        */
        handlers.registerWithMutex(socket, socketEvents.submitWord, async (word: string) => {
            await handlers.handleSubmitWord(socket, word);
        });

        /*
        * ===================================================================
        * REQUEST FULL STATE HANDLER
        * ===================================================================
        */
        handlers.registerWithMutex(socket, socketEvents.requestFullState, () => {
            handlers.handleRequestFullState(socket);
        });

        socket.onAny((eventName) => {
            console.log(`[socket] got event -> ${eventName}`);
        });

    }

    return handler;
}
