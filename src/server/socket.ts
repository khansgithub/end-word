import http from "http";
import { Server as SocketServer } from "socket.io";
import { ExtendedError } from "socket.io";

import { MAX_PLAYERS } from "../shared/consts";
import {
    ClientToServerEvents,
    PlayersArray,
    ServerPlayerSocket,
    SocketEvents
} from "../shared/types";

/* -------------------------------------------------------------------------- */
/*                                   State                                    */
/* -------------------------------------------------------------------------- */

const connectedPlayersArr: PlayersArray = Array(MAX_PLAYERS).fill(undefined) as PlayersArray;
let connectedPlayersCount = 0;

/* -------------------------------------------------------------------------- */
/*                               Server Factory                               */
/* -------------------------------------------------------------------------- */

export function createIOServer(server: http.Server): SocketServer {
    const io = new SocketServer(server, {
        cors: { origin: "*" }
    });

    return setUpIOServer(io);
}

export function setUpIOServer(io: SocketServer): SocketServer {
    // io.use(playerMiddleware);
    io.on("connection", onConnect);
    return io;
}

/* -------------------------------------------------------------------------- */
/*                                 Middleware                                 */
/* -------------------------------------------------------------------------- */

function playerMiddleware(
    socket: ServerPlayerSocket,
    next: (err?: ExtendedError) => void
) {
    const playerId = socket.data.profile?.playerId;
    console.log(`middleware - player id: ${playerId}`);

    if (playerId == null) {
        const availableIndex = connectedPlayersArr.findIndex(v => v === undefined);

        if (availableIndex >= 0) {
            console.log(`middleware - assigning seat ${availableIndex}`);

            socket.data.profile = { playerId: availableIndex };
            connectedPlayersCount++;
        } else {
            console.log("middleware - room is full");
            // TODO: handle full room
        }
    } else {
        console.log("middleware - returning player");
    }

    next();
}

/* -------------------------------------------------------------------------- */
/*                              Connection Logic                               */
/* -------------------------------------------------------------------------- */

function onConnect(socket: ServerPlayerSocket) {
    console.log("Client connected");
    console.log("socket id:", socket.id);

    // console.log("player_number:", socket.data.profile.playerId);

    registerSocketEvents(socket);

    socket.on("disconnect", (reason: string) => {
        if (socket.data) {
            connectedPlayersArr[socket.data.profile.playerId] = undefined;
            connectedPlayersCount--;
        }
    });

    // socket.emit("playerJoin", socket.data.profile);
}

/* -------------------------------------------------------------------------- */
/*                               Event Handlers                               */
/* -------------------------------------------------------------------------- */

function getPlayerCount(socket: ServerPlayerSocket) {
    console.log("socket: getPlayerCount");
    socket.emit("playerCount", connectedPlayersCount);
}

function getRoomState(socket: ServerPlayerSocket) {
    console.log("socket: getRoomState");
    // TODO: emit room state
}

/* -------------------------------------------------------------------------- */
/*                              Event Registry                                */
/* -------------------------------------------------------------------------- */

const socketEvents: Record<
    keyof Omit<ClientToServerEvents, keyof SocketEvents>,
    (socket: ServerPlayerSocket, ...args: any[]) => void
> = {
    getPlayerCount,
    getRoomState
};

function registerSocketEvents(socket: ServerPlayerSocket) {
    (Object.keys(socketEvents) as Array<keyof typeof socketEvents>).forEach(
        event => {
            socket.on(event, (...args: any[]) =>
                socketEvents[event](socket, ...args)
            );
        }
    );
}