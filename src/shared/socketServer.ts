
import { Server as SocketServer } from "socket.io";
import { buildInitialGameState, gameStateReducer, makePlayersArray } from "./GameState";
import { assertIsRequiredGameState, assertIsRequiredPlayerWithId, isRequiredGameState } from "./guards";
import { socketEvents } from "./socket";
import { ClientPlayers, ClientToServerEvents, PlayersArray, PlayerWithoutId, RunExclusive, type GameState, type Player, type PlayerWithId, type ServerPlayers, type ServerPlayerSocket, type ServerToClientEvents } from "./types";
import { createSocketMutex, pp, cloneServerPlayersToClientPlayers, inputIsValid } from "./utils";

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
    initialState?: GameState<ServerPlayers>,
    instrumentation?: ServerSocketContext["instrumentation"],
    io?: SocketServer
): ServerSocketContext {
    return {
        state: initialState ?? buildInitialGameState({ server: true }),
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

    /**
     * Broadcasts the current game state to all connected clients.
     * Each client receives a version with their own thisPlayer set.
     */
    function broadcastGameStateUpdate() {
        if (!isRequiredGameState(state)) {
            logWithContext("Cannot broadcast game state: state is not complete");
            return;
        }

        // TODO: This is inefficient
        // Broadcast to all registered sockets
        registeredSockets.forEach((player, auth) => {
            const clientPlayers = cloneServerPlayersToClientPlayers(state.players);
            clientPlayers[player.seat] = player;
            
            const clientState: GameState<ClientPlayers> = {
                ...state,
                players: clientPlayers,
                thisPlayer: player
            };
            
            assertIsRequiredGameState(clientState);

            // Find the socket for this player and emit to it
            if (context.io) {
                context.io.sockets.sockets.forEach((sock) => {
                    const sockAuth = getClientId(sock as ServerPlayerSocket);
                    if (sockAuth === auth) {
                        emitWithLogging(logWithContext, sock as ServerPlayerSocket, socketEvents.gameStateUpdate, clientState);
                    }
                });
            }
        });
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

        const clientPlayers = cloneServerPlayersToClientPlayers(nextState.players);
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
        const playerWithNoId: Player = {...nextState.thisPlayer};
        delete playerWithNoId.uid;
        
        emitWithLogging(logWithContext, socket, socketEvents.playerRegistered, clientState);
        broadcastEmitWithLogging(logWithContext, socket, socketEvents.playerJoinNotification, playerWithNoId); //BUG: compiler didn't raise an error when playerWithNoId was infact of type PlayerWithId
        logWithContext(JSON.stringify(Array.from(registeredSockets.entries())));
        
        // Broadcast updated state after player joins
        broadcastGameStateUpdate();
    };
    function _returnExistingPlayer(socket: ServerPlayerSocket, existingPlayer: PlayerWithId) {
        assertIsRequiredPlayerWithId(existingPlayer);

        const clientPlayers = cloneServerPlayersToClientPlayers(state.players);
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
        
        // Broadcast updated state after player removal
        broadcastGameStateUpdate();

    }

    // ===================================================================
    // EVENT HANDLER REGISTRATION 
    // ===================================================================
    function handler(socket: ServerPlayerSocket) {
        logWithContext(`Client connected id=${socket.id} auth=${JSON.stringify(socket.handshake.auth)}`);
        metrics.incrementConnections();
        metrics.countEvent("connect");

        /*
        * ===================================================================
        * DISCONNECT HANDLER
        * ===================================================================
        * This is the handler for the disconnect event.
        * It removes the player from the game state.
        * ===================================================================
        */
        registerWithMutex(socket, socketEvents.disconnect, (reason) => handleDisconnect(socket, reason));

        socket.on(socketEvents.text, (text: string) => {
            console.log("text", text);
            console.log(`Text from client: ${text}`);
        });

        /*
        * ===================================================================
        * GET PLAYER COUNT HANDLER
        * ===================================================================
        * This is the handler for the getPlayerCount event.
        * It returns the number of players in the game.
        * ===================================================================
        */
        registerWithMutex(socket, socketEvents.getPlayerCount, async () => {
            metrics.recordGetPlayerCountRequest();
            logWithContext(`getPlayerCount -> ${state.connectedPlayers}`);
            emitWithLogging(logWithContext, socket, socketEvents.playerCount, state.connectedPlayers);
        });

        /*
        * ===================================================================
        * REGISTER PLAYER HANDLER
        * ===================================================================
        * This is the handler for the registerPlayer event.
        * It registers the player to the game state.
        * ===================================================================
        */
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

        /*
        * ===================================================================
        * RETURNING PLAYER HANDLER
        * ===================================================================
        * This is the handler for the isReturningPlayer event.
        * It returns the player to the client.
        * ===================================================================
        */
        registerWithMutex(socket, socketEvents.isReturningPlayer, async (clientId) => {
            logWithContext("registeredSockets keys: " + JSON.stringify(Array.from(registeredSockets.keys())));
            const player = registeredSockets.get(clientId);
            logWithContext("clientId: " + clientId);
            logWithContext("player: " + JSON.stringify(player));
            logWithContext("registeredSockets keys" + JSON.stringify(Array.from(registeredSockets.keys())));
            if (player === undefined) return;
            emitWithLogging(logWithContext, socket, socketEvents.returningPlayer, player);
        });

        /*
        * ===================================================================
        * WORD SUBMISSION HANDLER
        * ===================================================================
        * This is the handler for the submitWord event.
        * It validates the word, checks if it's the player's turn, and updates the game state.
        * It then broadcasts the updated game state to all clients.
        * ===================================================================
        */
        registerWithMutex(socket, socketEvents.submitWord, async (word: string) => {
            logWithContext(`submitWord from ${getClientId(socket)}: ${word}`);
            metrics.countEvent("submitWord");

            const auth = getClientId(socket);
            const player = registeredSockets.get(auth);
            
            if (!player) {
                logWithContext(`submitWord: player not found for ${auth}`);
                return;
            }

            // Validate it's the player's turn
            if (state.turn !== player.seat) {
                logWithContext(`submitWord: not player's turn. Current turn: ${state.turn}, Player seat: ${player.seat}`);
                return;
            }

            // Validate word matches the match letter
            const currentMatchLetter = state.matchLetter.block;
            if (word.length === 0 || word[0] !== currentMatchLetter) {
                logWithContext(`submitWord: word doesn't match. Expected starting with: ${currentMatchLetter}, got: ${word}`);
                return;
            }

            // Validate word is valid
            const validWord = await inputIsValid(word);
            if (!validWord) {
                logWithContext(`submitWord: word is not valid`);
                return;
            }

            // Update game state on server (source of truth)
            const block = word.slice(-1); // Last character becomes next match letter
            const nextState = gameStateReducer(state, {
                type: "progressNextTurn",
                payload: [state, block, word],
            });

            setState(nextState);
            logWithContext(`Game state updated. New turn: ${nextState.turn}, New match letter: ${nextState.matchLetter.block}`);

            // Broadcast updated state to all clients (server is source of truth)
            broadcastGameStateUpdate();
        });

        /*
        * ===================================================================
        * REQUEST FULL STATE HANDLER
        * ===================================================================
        * This is the handler for the requestFullState event.
        * It returns the full game state to the client.
        * ===================================================================
        */
        registerWithMutex(socket, socketEvents.requestFullState, () => {
            logWithContext(`requestFullState from ${getClientId(socket)}`);
            metrics.countEvent("requestFullState");

            const auth = getClientId(socket);
            const player = registeredSockets.get(auth);
            
            if (!player) {
                logWithContext(`requestFullState: player not found for ${auth}`);
                return;
            }

            if (!isRequiredGameState(state)) {
                logWithContext("requestFullState: state is not complete");
                return;
            }

            const clientPlayers = cloneServerPlayersToClientPlayers(state.players);
            clientPlayers[player.seat] = player;
            
            const clientState: GameState<ClientPlayers> = {
                ...state,
                players: clientPlayers,
                thisPlayer: player
            };
            
            assertIsRequiredGameState(clientState);
            emitWithLogging(logWithContext, socket, socketEvents.fullStateSync, clientState);
        });

        socket.onAny((eventName) => {
            logWithContext(`got event -> ${eventName}`);
        });

    }

    return handler;
}
