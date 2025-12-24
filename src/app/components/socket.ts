import { io } from "socket.io-client";
import { registerClientSocketHandlers, socketEvents } from "../../shared/socket";
import type { ClientPlayerSocket } from "../../shared/types";
import { useSocketStore } from "../store/userStore";

export function getSocketManager(clientId?: string): ClientPlayerSocket {
    let socket = useSocketStore.getState().socket;
    if (socket === null) {
        if (clientId === undefined) throw new Error("clientId is needed for initial socket connection")
        socket = io({
            auth: {clientId},
        });
        useSocketStore.getState().setSocket(socket);
    }

    socket.on(socketEvents.disconnect, (reason) => {
        console.log("socket disconnect handler: " + reason);
    });

    return socket;
}

export const handleSocket = registerClientSocketHandlers;
