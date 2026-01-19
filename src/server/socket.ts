import http from "http";
import { Server as SocketServer } from "socket.io";
import { createServerConnectionHandler, createServerSocketContext, type ServerSocketContext } from "../shared/socketServer";
import { countSocketEvent, setRegisteredClients } from "./metrics";
import { fml } from "./fml";
import { GameState } from "../shared/types";

let activeServerContext: ServerSocketContext | null = null;

export function getServerSocketContext(): ServerSocketContext {
    if (activeServerContext === null) {
        throw new Error("Server socket context has not been initialized");
    }
    return activeServerContext;
}

export function createIOServer(server: http.Server): SocketServer {
    const io = new SocketServer(server, {
        cors: { origin: "*" },
        pingInterval: 2000,
        pingTimeout: 5000,
    });

    return setUpIOServer(io);
}

export function setUpIOServer(socketServer: SocketServer): SocketServer {
    socketServer.on("connection", fml);
    return socketServer;
}
  