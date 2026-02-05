import http from "http";
import { Server as SocketServer } from "socket.io";
import { createServerSocketContext, type ServerSocketContext } from "../shared/socketServer";
import { GameState, ServerPlayerSocket } from "../shared/types";
import { fml } from "./fml";

let activeServerContext: ServerSocketContext | null = null;
let socketServer: SocketServer | null = null;

export function getServerSocketContext(): ServerSocketContext {
    if (activeServerContext === null) {
        throw new Error("Server socket context has not been initialized");
    }
    return activeServerContext;
}

export function createIOServer(server: http.Server): SocketServer {
    socketServer = new SocketServer(server, {
        cors: { origin: "*" },
        pingInterval: 2000,
        pingTimeout: 5000,
    });

    return setUpIOServer(socketServer);
}

export function setUpIOServer(socketServer: SocketServer): SocketServer {
    const socketConextWrapper = (socket: ServerPlayerSocket) => {
        fml(socket, createServerSocketContext());
    };
    socketServer.on("connection", socketConextWrapper);
    return socketServer;
}

function broadcastGameState(gameState: GameState){
    if (!socketServer) return;
    socketServer.emit("broadcast game state test", "test");
}

