import http from "http";
import { Server as SocketServer } from "socket.io";
import { createServerConnectionHandler, createServerSocketContext, type ServerSocketContext } from "../shared/socket";
import { countSocketEvent, setRegisteredClients } from "./metrics";

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
        pingInterval: 500,
        pingTimeout: 1000,
    });

    return setUpIOServer(io);
}

export function setUpIOServer(io: SocketServer): SocketServer {
    const serverSocketContext = createServerSocketContext(undefined, {
        countEvent: countSocketEvent,
        setRegisteredClients,
    });
    activeServerContext = serverSocketContext;
    io.on("connection", createServerConnectionHandler(serverSocketContext));
    return io;
}
