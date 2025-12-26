import type { ActionDispatch } from "react";
import { GameStateActionsType } from "./GameState";
import { socketEvents } from "./socket";
import type { ClientPlayerSocket, GameState } from "./types";

// Used to ensure we only attach a single handler set per client socket.
const clientSocketsWithHandlers = new WeakSet<ClientPlayerSocket>();

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
        console.log("playerRegistered: dispatch");
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
