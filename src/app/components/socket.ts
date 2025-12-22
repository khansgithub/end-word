import { ActionDispatch } from "react";
import { io } from "socket.io-client";
import { GameStateActionsType } from "../../shared/GameState";
import { ClientPlayerSocket, GameState } from "../../shared/types";
import { useSocketStore } from "../store/userStore";

export function getSocketManager(): ClientPlayerSocket {
    let socket = useSocketStore.getState().socket;
    if (socket === null) {
        socket = io({});
        useSocketStore.getState().setSocket(socket);
    }
    socket.on("disconnect", (reason) => {
        console.log("socket disconnect handler: " + reason);
    });

    return socket;
}

export function handleSocket(
    socket: ClientPlayerSocket,
    state: GameState,
    dispatch: ActionDispatch<[action: GameStateActionsType]>
) {
    if (!socket.connected) {
        console.warn("Socket is not connected");
        return;
    }

    socket.on("connect", () => {
        console.log(`Connected to socket: ${socket.id}`)
    });
    
    socket.on("playerCount", count => {
        dispatch({
            type: "updateConnectedPlayersCount",
            payload: [state, count]
        });
    });

    socket.on("playerJoinNotification", newPlayer => {
        dispatch({
            type: "addPlayer",
            payload: [state, newPlayer],
        });
    });

    socket.on("playerLeaveNotification", player => {
        dispatch({
            type: "removePlayer",
            payload: [state, player],
        });
    });

    socket.on("playerRegistered", (state) => {
        const player = state.thisPlayer;
        dispatch({
            type: "addPlayer",
            payload: [state, player, true]
        });
    });

    socket.on("playerNotRegistered", reason => {
        throw new Error("handle when room is full: " + reason);
    });

    socket.on("text", text => {
        console.log(`Text from server: ${text}`);
    });

    // if (registeredSockets.has(socketInstance)) {
    //     return;
    // }
}