import http from "http";
import { Server as SocketServer } from "socket.io";
import { ServerContextNotSetupError } from "@/shared/errors";
import { createServerSocketContext } from "@/server/context";
import { GameState, ServerPlayerSocket } from "@/shared/types";
import { fml } from "@/server/socketHandlers";
import { getServerSocketContext, setActiveServerContext } from "@/server/context";

let socketServer: SocketServer | null = null;

export function createIOServer(server: http.Server): SocketServer {
    socketServer = new SocketServer(server, {
        cors: { origin: "*" },
        pingInterval: 2000,
        pingTimeout: 5000,
    });

    setActiveServerContext(createServerSocketContext(undefined, undefined, socketServer));
    return setUpIOServer(socketServer);
}

export function setUpIOServer(socketServer: SocketServer): SocketServer {
    const socketConextWrapper = (socket: ServerPlayerSocket) => {
        const ctx = getServerSocketContext();
        if (!ctx) throw new ServerContextNotSetupError();
        fml(socket, ctx);
    };
    socketServer.on("connection", socketConextWrapper);
    return socketServer;
}

export function purgeSockets(socketServer: SocketServer) {
    socketServer.disconnectSockets()
}

