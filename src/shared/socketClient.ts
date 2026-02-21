import type { Dispatch, SetStateAction } from "react";
import { GameStateDispatch } from "./GameState";
import { SocketEventName, socketEvents } from "./socketEvents";
import type { AckRegisterPlayerResponse, AckSubmitWordResponseParams, ClientPlayerSocket, GameState, Player, PlayerWithId, ServerToClientEvents } from "./types";
import { pp } from "./utils";

const L = "socketClient: "
const log = console.log;
// const pp = isSuppress() ? () => { return "[SUPPRESS=TRUE]"; } : prettyprint;

// Used to ensure we only attach a single handler set per client socket.
const clientSocketsWithHandlers = new WeakSet<ClientPlayerSocket>();
const clientSocketEventHandlers = new Map<SocketEventName, unknown>();

export function emitSubmitWord(
    socket: ClientPlayerSocket,
    word: string,
    callback: (response: AckSubmitWordResponseParams) => void
) {
    socket.emit(socketEvents.submitWord, word, callback);
}

export function emitRegisterPlayer(
    socket: ClientPlayerSocket,
    player: PlayerWithId,
    callback: (response: AckRegisterPlayerResponse) => void
) {
    socket.emit(socketEvents.registerPlayer, player, callback);
}

// Wires client listeners to update the local game state based on server pushes.
export function registerClientSocketHandlers(
    socket: ClientPlayerSocket,
    state: GameState,
    dispatch: GameStateDispatch
) {
    if (!socket.connected) {
        console.warn("Socket is not connected");
        return;
    }

    if (clientSocketsWithHandlers.has(socket)) {
        return;
    }

    clientSocketsWithHandlers.add(socket);

    socket.onAny((e => {
        log(L, "event: ", e);
    }))

    socket.on(socketEvents.connect, () => {
        log(L, `Connected to socket: ${socket.id}, ${socket.auth}`);
        // Request full state sync on reconnection to ensure we're in sync
        if (state.thisPlayer) {
            socket.emit(socketEvents.requestFullState, (serverState) => {
                dispatch({
                    type: "gameStateUpdateClient",
                    payload: [{ ...serverState }],
                });
            });
        }
    });

    // Handle game state updates from server (source of truth)
    socket.on(socketEvents.gameStateUpdate, (stateEmit) => {
        log(L, "gameStateUpdate received from server:", pp(stateEmit));

        // always replace the thisPlayer in the serverState with the local state thisPlayer
        // Replace local state with server state (server is source of truth)

        // The health is tracked by the server. Starting to get messy...
        const updatedThisPlayer = {
            ...state.thisPlayer,
            health: stateEmit.players[state.thisPlayer?.seat!]?.health!
        } as PlayerWithId;
        dispatch({
            type: "replaceGameState",
            payload: [{ ...stateEmit, thisPlayer: updatedThisPlayer }],
        });
    });

    socket.on(socketEvents.text, (text) => {
        log(L, `Text from server: ${text}`);
    });
}

export function emitIsReturningPlayer(
    socket: ClientPlayerSocket,
    clientId: string,
    setReturningPlayer: Dispatch<SetStateAction<Player | null>>) {
    /**
     * @param {ClientPlayerSocket} socket - The socket instance to use for communication.
     * @param {string} clientId - The clientId to check.
     * @param {(player: Player) => void} setReturningPlayer - React setState callback to set the returning player.
     */
    socket.emit(socketEvents.isReturningPlayer, clientId, (({ found, player }) => {
        log(L, "isReturningPlayer: ", found, player);
        if (found && player) setReturningPlayer(player);
    }));
}

export function socketGetPlayerCount(
    socket: ClientPlayerSocket,
    setPlayerCount: (count: number) => void) {
    socket.emit(socketEvents.getPlayerCount, (count) => {
        log(L, "getPlayerCount: ", count);
        setPlayerCount(count);
    });
}

export function onSocketEvent<T extends keyof ServerToClientEvents>(
    socket: ClientPlayerSocket,
    event: T,
    callback: ServerToClientEvents[T]
) {
    if (clientSocketEventHandlers.has(event)) {
        return;
    }
    clientSocketEventHandlers.set(event, callback);
    socket.on(event, callback as any);
}