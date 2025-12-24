import type { ActionDispatch } from "react";
import { GameStateActionsType, buildInitialGameState, gameStateReducer } from "./GameState";
import type { ClientPlayerSocket, GameState, Player, ServerPlayerSocket } from "./types";

// ---------------------- Shared contract ----------------------
// Socket event names so the client and server stay in sync.

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
    text: "text",
} as const;

type RunExclusive = <T>(fn: () => Promise<T> | T) => Promise<T>;

// Used to ensure we only attach a single handler set per client socket.
const clientSocketsWithHandlers = new WeakSet<ClientPlayerSocket>();

export type ServerSocketContext = {
    state: GameState;
    runExclusive: RunExclusive;
    registeredSockets: Map<string, Player>;
};

// Promise-based mutex to serialize state mutations across concurrent socket events.
export function createSocketMutex(): RunExclusive {
    let last: Promise<void> = Promise.resolve();

    return <T>(fn: () => Promise<T> | T): Promise<T> => {
        const run = last.then(fn);
        last = run.then(() => undefined, () => undefined);
        return run;
    };
}

export function createServerSocketContext(initialState?: GameState): ServerSocketContext {
    return {
        state: initialState ?? buildInitialGameState(),
        runExclusive: createSocketMutex(),
        registeredSockets: new Map<string, Player>(),
    };
}

// ---------------------- Client side ----------------------
// Wires client listeners to update the local game state based on server pushes.
export function registerClientSocketHandlers(
    socket: ClientPlayerSocket,
    state: GameState,
    dispatch: ActionDispatch<[action: GameStateActionsType]>
) {
    if (!socket.connected) {
        console.warn("Socket is not connected");
        return;
    }

    if (clientSocketsWithHandlers.has(socket)) {
        return;
    }
    clientSocketsWithHandlers.add(socket);

    socket.on(socketEvents.connect, () => {
        console.log(`Connected to socket: ${socket.id}, ${socket.auth}`);
    });

    socket.on(socketEvents.playerCount, (count) => {
        dispatch({
            type: "updateConnectedPlayersCount",
            payload: [state, count],
        });
    });

    socket.on(socketEvents.playerJoinNotification, (newPlayer) => {
        dispatch({
            type: "addPlayer",
            payload: [state, newPlayer],
        });
    });

    socket.on(socketEvents.playerLeaveNotification, (player) => {
        dispatch({
            type: "removePlayer",
            payload: [state, player],
        });
    });

    socket.on(socketEvents.playerRegistered, (serverState) => {
        const player = serverState.thisPlayer;
        dispatch({
            type: "addPlayer",
            payload: [state, player, true],
        });
    });

    socket.on(socketEvents.playerNotRegistered, (reason) => {
        throw new Error("handle when room is full: " + reason);
    });

    socket.on(socketEvents.text, (text) => {
        console.log(`Text from server: ${text}`);
    });
}

// ---------------------- Server side ----------------------
// Builds a connection handler that registers all server-side listeners for a new client.
export function createServerConnectionHandler(context: ServerSocketContext) {
    let state = context.state;
    const { runExclusive, registeredSockets } = context;

    return (socket: ServerPlayerSocket) => {
        console.log("Client connected");
        console.log("socket id:", socket.id);
        console.log("auth:", socket.handshake.auth);
        console.log("gameUpdate");

        socket.on(socketEvents.text, (text: string) => {
            console.log("text", text);
            console.log(`Text from client: ${text}`);
        });

        socket.on(socketEvents.getPlayerCount, () => {
            console.log("getPlayerCount", state.connectedPlayers);
            socket.emit(socketEvents.playerCount, state.connectedPlayers);
        });

        socket.on(socketEvents.registerPlayer, (playerProfile: Player) => {
            void runExclusive(async () => {
                console.log("registerPlayer", playerProfile);
                // Guard against multiple register events from the same socket.
                const auth = socket.handshake.auth.clientId;
                if (registeredSockets.has(auth)) {
                    console.warn(`Skipping player because player is already registered. ${socket.id} ${JSON.stringify(registeredSockets.get(auth))}`);
                    return;
                }

                const availableIndex = state.players.findIndex((v) => v === null);
                if (availableIndex === -1) {
                    const reason = "room is full";
                    socket.emit(socketEvents.playerNotRegistered, reason);
                    return;
                }

                // Reserve the seat and broadcast the new player; state updates are serialized by runExclusive.
                const playerProfileWithId: Player = { ...playerProfile, seat: availableIndex };
                const reducerParams = [
                    state,
                    playerProfileWithId,
                    true,
                ] as const;

                const nextState = gameStateReducer(state, {
                    type: "addPlayer",
                    payload: [...reducerParams],
                });
                const newPlayer = nextState.thisPlayer;
                if (newPlayer === undefined) {
                    console.warn(nextState);
                    throw new Error("nextState.thisPlayer should be the registered players but its undefined");
                }

                state = nextState;
                context.state = nextState;
                registeredSockets.set(auth, newPlayer);

                console.log(`assigning seat to ${auth} ${newPlayer}: ${availableIndex}`);

                socket.emit(socketEvents.playerRegistered, nextState as Required<GameState>);
                socket.broadcast.emit(socketEvents.playerJoinNotification, playerProfile);
            });
        });

        socket.on(socketEvents.disconnect, (reason) => {
            console.log("Runnign disconnect handler: ", reason);
            
            void runExclusive(async () => {
                const auth = socket.handshake.auth.clientId;
                const player = registeredSockets.get(auth);
                if (player === undefined) {
                    console.log(`no player with socketid: ${auth}`);
                    return;
                }

                // Remove the player and notify remaining clients.
                const nextState = gameStateReducer(state, {
                    type: "removePlayer",
                    payload: [state, player],
                });

                state = nextState;
                context.state = nextState;
                registeredSockets.delete(auth);
                socket.broadcast.emit(socketEvents.playerLeaveNotification, player);
            });
        });

        socket.onAny((eventName) => {
            console.log(`event -> ${eventName}`);
        });
    };
}
