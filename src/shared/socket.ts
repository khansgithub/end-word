import type { ActionDispatch } from "react";
import { GameStateActionsType, buildInitialGameState, gameStateReducer } from "./GameState";
import type { ClientPlayerSocket, GameState, Player, ServerPlayerSocket } from "./types";

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

export type ServerSocketContext = {
    state: GameState;
    runExclusive: RunExclusive;
    registeredSockets: Map<string, Player>;
};

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

const clientSocketsWithHandlers = new WeakSet<ClientPlayerSocket>();

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
        console.log(`Connected to socket: ${socket.id}`);
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

export function createServerConnectionHandler(context: ServerSocketContext) {
    let state = context.state;
    const { runExclusive, registeredSockets } = context;

    return (socket: ServerPlayerSocket) => {
        console.log("Client connected");
        console.log("socket id:", socket.id);
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
                if (registeredSockets.has(socket.id)) {
                    console.warn(`Skipping player because player is already registered. ${socket.id} ${JSON.stringify(registeredSockets.get(socket.id))}`);
                    return;
                }

                const availableIndex = state.players.findIndex((v) => v === null);
                if (availableIndex === -1) {
                    const reason = "room is full";
                    socket.emit(socketEvents.playerNotRegistered, reason);
                    return;
                }

                const playerProfileWithId: Player = { ...playerProfile, playerId: availableIndex };
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
                registeredSockets.set(socket.id, newPlayer);

                console.log(`assigning seat to ${socket.id} ${newPlayer}: ${availableIndex}`);

                socket.emit(socketEvents.playerRegistered, nextState as Required<GameState>);
                socket.broadcast.emit(socketEvents.playerJoinNotification, playerProfile);
            });
        });

        socket.on(socketEvents.disconnect, () => {
            void runExclusive(async () => {
                const player = registeredSockets.get(socket.id);
                if (player === undefined) {
                    console.log(`no player with socketid: ${socket.id}`);
                    return;
                }

                const nextState = gameStateReducer(state, {
                    type: "removePlayer",
                    payload: [state, player],
                });

                state = nextState;
                context.state = nextState;
                registeredSockets.delete(socket.id);
                socket.broadcast.emit(socketEvents.playerLeaveNotification, player);
            });
        });

        socket.onAny((eventName) => {
            console.log(`event -> ${eventName}`);
        });
    };
}
