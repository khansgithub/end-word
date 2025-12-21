import { io } from "socket.io-client";
import { useSocketStore } from "../store/userStore";
import { ClientPlayerSocket, GameState } from "../../shared/types";
import { ActionDispatch, Dispatch } from "react";
import { GameStateActionsType } from "../../shared/GameState";

export function getSocketManager(): ClientPlayerSocket {
    let socket = useSocketStore.getState().socket;
    if (socket === null) {
        socket = io();
        useSocketStore.getState().setSocket(socket);
    }
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

    socket.on("connect", () => {});
    socket.on("playerCount", count => {
        dispatch({
            type: "updateConnectedUsers",
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

    socket.on("playerRegistered", (state, profile) => {
        dispatch({
            type: "addPlayer",
            payload: [state, profile],
        });
    });

    socket.on("text", text => {

    });

    // if (registeredSockets.has(socketInstance)) {
    //     return;
    // }
}