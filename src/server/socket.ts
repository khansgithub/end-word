import http from "http";
import { Server as SocketServer } from "socket.io";
import { createServerConnectionHandler, createServerSocketContext } from "../shared/socket";

export function createIOServer(server: http.Server): SocketServer {
    const io = new SocketServer(server, {
        cors: { origin: "*" },
        pingInterval: 500,
        pingTimeout: 1000,
    });

    return setUpIOServer(io);
}

export function setUpIOServer(io: SocketServer): SocketServer {
    const serverSocketContext = createServerSocketContext();
    io.on("connection", createServerConnectionHandler(serverSocketContext));
    return io;
}
