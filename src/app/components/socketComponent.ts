import { io } from "socket.io-client";
import { socketEvents } from "../../shared/socket";
import type { ClientPlayerSocket } from "../../shared/types";
import { useSocketStore } from "../store/userStore";


/**
 * Returns the global ClientPlayerSocket instance, or creates it if absent.
 * - If there is no socket in state, a new socket.io-client connection is created,
 *   using the provided `clientId` for authentication (throws if missing on initial connect).
 * - The socket is also registered in the socket store for re-use.
 * - Attaches a disconnect handler that logs disconnect reasons.
 *
 * @param {string} [clientId] - Optional clientId to use for authentication. Required on initial connection.
 * @returns {ClientPlayerSocket} The initialized or existing socket instance.
 * @throws If no socket exists and clientId is not provided.
 */

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
