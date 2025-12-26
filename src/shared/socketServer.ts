import { buildInitialGameState, gameStateReducer } from "./GameState";
import { assertIsConcretePlayer } from "./guards";
import { socketEvents } from "./socket";
import type { GameState, Player, ServerPlayerSocket } from "./types";

type RunExclusive = (fn: () => Promise<void>) => Promise<void>;

export type ServerSocketContext = {
    state: GameState;
    runExclusive: RunExclusive;
    registeredSockets: Map<string, Player>;
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

// Promise-based mutex to serialize state mutations across concurrent socket events.
export function createSocketMutex(): RunExclusive {
    let last: Promise<void> = Promise.resolve();

    return <T>(fn: () => Promise<T> | T): Promise<T> => {
        const run = last.then(fn);
        last = run.then(() => undefined, () => undefined);
        return run;
    };
}

export function createServerSocketContext(
    initialState?: GameState,
    instrumentation?: ServerSocketContext["instrumentation"]
): ServerSocketContext {
    return {
        state: initialState ?? buildInitialGameState(),
        runExclusive: createSocketMutex(),
        registeredSockets: new Map<string, Player>(),
        stats: {
            getPlayerCount: 0,
            connections: 0,
        },
        instrumentation,
        logs: [],
    };
}

function log(context: ServerSocketContext, message: string) {
    const entry = { ts: Date.now(), msg: `[socket] ${message}` };
    context.logs.push(entry);
    if (context.logs.length > 500) context.logs.shift();
    console.log(new Date(entry.ts).toISOString(), entry.msg);
}

// Builds a connection handler that registers all server-side listeners for a new client.
export function createServerConnectionHandler(context: ServerSocketContext) {
    let state = context.state;
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
    const logWithContext = (message: string) => log(context, message);

    return (socket: ServerPlayerSocket) => {
        const clientId = () => socket.handshake.auth.clientId;

        const setState = (nextState: GameState) => {
            state = nextState;
            context.state = nextState;
        };

        const emitExistingRegistration = (auth: string, player: Player) => {
            logWithContext(`Skipping player because already registered clientId=${auth} socketId=${socket.id}`);
            assertIsConcretePlayer(player);
            const nextState: GameState = { ...state, thisPlayer: player };
            socket.emit(socketEvents.playerRegistered, nextState as Required<GameState>);
        };

        const findAvailableSeat = () => {
            const seat = state.players.findIndex((v) => v === null);
            return seat === -1 ? null : seat;
        };

        const addPlayerToState = (playerProfile: Player, seat: number) => {
            const playerProfileWithSeat: Player = { ...playerProfile, seat };
            const nextState = gameStateReducer(state, {
                type: "addPlayer",
                payload: [state, playerProfileWithSeat, true] as const,
            });
            const newPlayer = nextState.thisPlayer;
            if (!newPlayer) {
                console.warn(nextState);
                throw new Error("nextState.thisPlayer should be the registered player but it's undefined");
            }
            assertIsConcretePlayer(newPlayer);
            return { nextState, newPlayer, seat };
        };

        const handleRegisterPlayer = (playerProfile: Player) => {
            logWithContext(`registerPlayer ${JSON.stringify(playerProfile)}`);
            metrics.countEvent("registerPlayer");

            const auth = clientId();
            const existingPlayer = registeredSockets.get(auth);
            if (existingPlayer) {
                emitExistingRegistration(auth, existingPlayer);
                return;
            }

            const availableSeat = findAvailableSeat();
            if (availableSeat === null) {
                socket.emit(socketEvents.playerNotRegistered, "room is full");
                return;
            }

            const { nextState, newPlayer } = addPlayerToState(playerProfile, availableSeat);
            setState(nextState);
            registeredSockets.set(auth, newPlayer);
            metrics.setRegisteredClients(registeredSockets.size);

            logWithContext(`assigning seat to ${auth} ${JSON.stringify(newPlayer)} seat=${availableSeat}`);

            socket.emit(socketEvents.playerRegistered, nextState as Required<GameState>);
            socket.broadcast.emit(socketEvents.playerJoinNotification, playerProfile);

            logWithContext(JSON.stringify(registeredSockets.entries().toArray()));

        };

        const handleDisconnect = (reason: string) => {
            logWithContext(`disconnect ${socket.id} reason=${reason}`);
            metrics.countEvent("disconnect");
            const auth = clientId();
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
            socket.broadcast.emit(socketEvents.playerLeaveNotification, player);

        };

        // ===================================================================
        // EVENT HANDLER REGISTRATION 
        // ===================================================================
        logWithContext(`Client connected id=${socket.id} auth=${JSON.stringify(socket.handshake.auth)}`);
        metrics.incrementConnections();
        metrics.countEvent("connect");

        socket.on(socketEvents.text, (text: string) => {
            console.log("text", text);
            console.log(`Text from client: ${text}`);
        });

        socket.on(socketEvents.getPlayerCount, () => {
            runExclusive(async () => {
                metrics.recordGetPlayerCountRequest();
                logWithContext(`getPlayerCount -> ${state.connectedPlayers}`);
                socket.emit(socketEvents.playerCount, state.connectedPlayers);
            });
        });

        socket.on(socketEvents.registerPlayer, (player: Player) => {
            runExclusive(async () => handleRegisterPlayer(player));
        });

        socket.on(socketEvents.disconnect, (reason: string) => {
            runExclusive(async () => handleDisconnect(reason));
        });

        socket.on(socketEvents.isReturningPlayer, (clientId: string) => {
            logWithContext("registeredSockets keys: " + registeredSockets.keys().toArray())

            runExclusive(async () => {
                const player = registeredSockets.get(clientId);
                logWithContext("clientId: " + clientId);
                logWithContext("player: " + JSON.stringify(player));
                logWithContext("registeredSockets keys" + registeredSockets.keys().toArray())
                if (player === undefined) return
                socket.emit("returningPlayer", player);
            });
        });

        socket.on("foo", (text: string) => {
            runExclusive(async () => {
                logWithContext("registeredSockets keys" + registeredSockets.keys().toArray())
            });
        });

        socket.onAny((eventName) => {
            console.log(`event -> ${eventName}`);
        });


        // socket.conn.on("packet", function (packet) {
        //     logWithContext(`got packet of type: ${packet.type} from ${JSON.stringify(socket.handshake.auth)}`);
        //     if (packet.type === "ping") logWithContext("received ping");
        // });

        // socket.conn.on('packetCreate', function (packet) {
        //     if (packet.type === 'pong') logWithContext('sending pong');
        // });

    };
}
