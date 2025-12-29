
import { buildInitialGameState, gameStateReducer, makePlayersArray } from "./GameState";
import { assertIsRequiredGameState, assertIsRequiredPlayerWithId, isRequiredGameState } from "./guards";
import { socketEvents } from "./socket";
import { ClientPlayers, ClientToServerEvents, PlayersArray, PlayerWithoutId, type GameState, type Player, type PlayerWithId, type ServerPlayers, type ServerPlayerSocket, type ServerToClientEvents } from "./types";
import { createSocketMutex, pp, RunExclusive, serverPlayersToClientPlayers } from "./utils";

type PlayerUid = Exclude<PlayerWithId["uid"], undefined>;

function log(context: ServerSocketContext, message: string) {
    const entry = { ts: Date.now(), msg: `[socket] ${message}` };
    context.logs.push(entry);
    if (context.logs.length > 500) context.logs.shift();
    console.log(new Date(entry.ts).toISOString(), entry.msg);
}

function getClientId(socket: ServerPlayerSocket) {
    return socket.handshake.auth.clientId;
}

function emitWithLogging<E extends keyof ServerToClientEvents>(
    logWithContext: (message: string) => void,
    socket: ServerPlayerSocket,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
) {
    logWithContext("emitting: " + event);
    logWithContext("emitting payload: " + pp(args));
    socket.emit(event, ...args);
}

function broadcastEmitWithLogging<E extends keyof ServerToClientEvents>(
    logWithContext: (message: string) => void,
    socket: ServerPlayerSocket,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
) {
    logWithContext("broadcast emitting: " + event);
    logWithContext("broadcast emitting payload: " + pp(args));
    socket.broadcast.emit(event, ...args);
}

export type ServerSocketContext = {
    state: GameState<ServerPlayers>;
    runExclusive: RunExclusive;
    registeredSockets: Map<PlayerUid, Required<PlayerWithId>>;
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
    initialState?: GameState<ServerPlayers>,
    instrumentation?: ServerSocketContext["instrumentation"]
): ServerSocketContext {
    return {
        state: initialState ?? buildInitialGameState({ server: true }),
        runExclusive: createSocketMutex(),
        registeredSockets: new Map<PlayerUid, Required<PlayerWithId>>(),
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
    const { runExclusive, registeredSockets, stats } = context;
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

    function logWithContext(message: string) {
        log(context, message);
    }

    function setState(nextState: GameState<ServerPlayers>) {
        state = nextState;
        context.state = nextState;
    }

    function registerWithMutex<E extends keyof ClientToServerEvents>(
        socket: ServerPlayerSocket,
        event: E,
        listener: (...args: Parameters<ClientToServerEvents[E]>) => ReturnType<ClientToServerEvents[E]>
    ) {
        type Args = Parameters<ClientToServerEvents[E]>;
        const wrappedListener: (...args: Args) => void = (...args) => {
            void runExclusive(() => Promise.resolve(listener(...args))).catch((err) => {
                logWithContext(`handler for ${event} failed: ${err instanceof Error ? err.stack : err}`);
                throw err;
            });
        };

        // cast keeps typed listener while satisfying socket.io overload resolution
        socket.on(event, wrappedListener as any);
    }

    function _registerPlayer(
        socket: ServerPlayerSocket,
        player: PlayerWithId,
        auth: string
    ) {
        const seat = state.players.findIndex((v) => v === null);
        const availableSeat = seat === -1 ? null : seat;

        if (availableSeat === null) {
            emitWithLogging(logWithContext, socket, socketEvents.playerNotRegistered, "room is full");
            return;
        }

        const playerWithSeat: PlayerWithId = { ...player, seat };
        assertIsRequiredPlayerWithId(playerWithSeat);

        const nextState = gameStateReducer(state, {
            type: "addPlayer",
            payload: [{
                ...state,
                thisPlayer: playerWithSeat
            }, playerWithSeat] as const,
        });

        setState(nextState);
        registeredSockets.set(auth, playerWithSeat);
        metrics.setRegisteredClients(registeredSockets.size);

        logWithContext(`assigning seat to ${auth} ${JSON.stringify(playerWithSeat)} seat=${availableSeat}`);
        if (!isRequiredGameState(nextState)) {
            throw new Error("Expected thisPlayer to be set before emitting playerRegistered");
        }

        const clientPlayers = serverPlayersToClientPlayers(nextState.players);
        clientPlayers[nextState.thisPlayer.seat] = nextState.thisPlayer;

        const clientState: GameState<ClientPlayers> = {
            ...state, players: clientPlayers
        };

        assertIsRequiredGameState(clientState);

        // // ---------------------------------------------------------------------
        // clientState.players.forEach((v, i) => {
        //     if (v === null) return;
        //     if (v.seat !== clientState.thisPlayer.seat){
        //         console.log("DEBUG - ", v);
        //         console.log("v.seat !== clientState.thisPlayer.seat ::", `${v.seat} !== ${clientState.thisPlayer.seat}`)
        //         console.log(`${Object.keys(v)}`);
        //         if (Object.keys(v).includes("uid")){
        //             throw new Error(`${v} should not have UID`);
        //         }
        //     }
        //     if (v.seat == clientState.thisPlayer.seat){
        //         if (v.uid !== clientState.thisPlayer.uid) throw new Error(`${v} should have the UID of ${clientState.thisPlayer.uid}`)
        //     }
        // })
        // // ---------------------------------------------------------------------
        const playerWithNoId: Player = {...player};
        delete playerWithNoId.uid;
        
        emitWithLogging(logWithContext, socket, socketEvents.playerRegistered, clientState);
        broadcastEmitWithLogging(logWithContext, socket, socketEvents.playerJoinNotification, playerWithNoId); //BUG: compiler didn't raise an error when playerWithNoId was infact of type PlayerWithId
        logWithContext(JSON.stringify(Array.from(registeredSockets.entries())));
    };
    function _returnExistingPlayer(socket: ServerPlayerSocket, existingPlayer: PlayerWithId) {
        assertIsRequiredPlayerWithId(existingPlayer);

        const clientPlayers = serverPlayersToClientPlayers(state.players);
        clientPlayers[existingPlayer.seat] = existingPlayer;

        const clientState: GameState<ClientPlayers> = {
            ...state,
            players: clientPlayers,
            thisPlayer: existingPlayer
        };

        assertIsRequiredGameState(clientState);

        emitWithLogging(logWithContext, socket, socketEvents.playerRegistered, clientState);
    };

    function handleDisconnect(socket: ServerPlayerSocket, reason: string) {
        logWithContext(`disconnect ${socket.id} reason=${reason}`);
        metrics.countEvent("disconnect");
        const auth = getClientId(socket);
        const player = registeredSockets.get(auth);
        if (player === undefined) {
            logWithContext(`no player with client id: ${auth}`);
            return;
        }

        // Remove the player and notify remaining clients.
        const nextState = gameStateReducer(state, {
            type: "removePlayer",
            payload: [state, player],
        });

        setState(nextState);
        registeredSockets.delete(auth);
        metrics.setRegisteredClients(registeredSockets.size);
        broadcastEmitWithLogging(logWithContext, socket, socketEvents.playerLeaveNotification, player);

    }

    // ===================================================================
    // EVENT HANDLER REGISTRATION 
    // ===================================================================
    function handler(socket: ServerPlayerSocket) {
        logWithContext(`Client connected id=${socket.id} auth=${JSON.stringify(socket.handshake.auth)}`);
        metrics.incrementConnections();
        metrics.countEvent("connect");

        socket.on(socketEvents.text, (text: string) => {
            console.log("text", text);
            console.log(`Text from client: ${text}`);
        });

        registerWithMutex(socket, socketEvents.getPlayerCount, async () => {
            metrics.recordGetPlayerCountRequest();
            logWithContext(`getPlayerCount -> ${state.connectedPlayers}`);
            emitWithLogging(logWithContext, socket, socketEvents.playerCount, state.connectedPlayers);
        });

        registerWithMutex(socket, socketEvents.registerPlayer, (player) => {
            logWithContext(`registerPlayer ${JSON.stringify(player)}`);
            metrics.countEvent("registerPlayer");

            const auth = getClientId(socket);
            const existingPlayer = registeredSockets.get(auth);
            if (existingPlayer) {
                logWithContext(`Skipping player because already registered clientId=${auth} socketId=${socket.id}`);
                _returnExistingPlayer(socket, existingPlayer);
            } else {
                _registerPlayer(socket, player, auth);
            }
        });

        registerWithMutex(socket, socketEvents.disconnect, (reason) => handleDisconnect(socket, reason));

        registerWithMutex(socket, socketEvents.isReturningPlayer, async (clientId) => {
            logWithContext("registeredSockets keys: " + JSON.stringify(Array.from(registeredSockets.keys())));
            const player = registeredSockets.get(clientId);
            logWithContext("clientId: " + clientId);
            logWithContext("player: " + JSON.stringify(player));
            logWithContext("registeredSockets keys" + JSON.stringify(Array.from(registeredSockets.keys())));
            if (player === undefined) return;
            emitWithLogging(logWithContext, socket, socketEvents.returningPlayer, player);
        });

        socket.onAny((eventName) => {
            logWithContext(`got event -> ${eventName}`);
        });

    }

    return handler;
}
