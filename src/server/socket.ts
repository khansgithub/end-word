import http from "http";
import { Server as SocketServer } from "socket.io";
import { createServerConnectionHandler, createServerSocketContext, type ServerSocketContext } from "../shared/socketServer";
import { countSocketEvent, setRegisteredClients } from "./metrics";
import { fml } from "./fml";
import { GameState, ServerPlayerSocket } from "../shared/types";

let activeServerContext: ServerSocketContext | null = null;
let socketServer: SocketServer | null = null;
const socketContext = createServerSocketContext();

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
        fml(socket, socketContext);
    };
    socketServer.on("connection", socketConextWrapper);
    return socketServer;
}

function broadcastGameState(gameState: GameState){
    if (!socketServer) return;
    socketServer.emit("broadcast game state test", "test");
}