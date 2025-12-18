import http from "http";
import { Server as SocketServer } from "socket.io";

import { MAX_PLAYERS } from "../shared/consts";
import { buildInitialGameState } from "../shared/GameState";
import {
    ClientToServerEvents,
    Player,
    PlayersArray,
    ServerPlayerSocket,
    ServerToClientEvents,
    SharedSocketEvents
} from "../shared/types";

/* -------------------------------------------------------------------------- */
/*                                   State                                    */
/* -------------------------------------------------------------------------- */

const connectedPlayersArr: PlayersArray = Array(MAX_PLAYERS).fill(null) as PlayersArray;
const gameState = buildInitialGameState();
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

// function playerMiddleware(
//     socket: ServerPlayerSocket,
//     next: (err?: ExtendedError) => void
// ) {
//     const playerId = socket.data.profile?.playerId;
//     console.log(`middleware - player id: ${playerId}`);

//     if (playerId == null) {
//         const availableIndex = connectedPlayersArr.findIndex(v => v === undefined);

//         if (availableIndex >= 0) {
//             console.log(`middleware - assigning seat ${availableIndex}`);

//             socket.data.profile = { playerId: availableIndex };
//             connectedPlayersCount++;
//         } else {
//             console.log("middleware - room is full");
//             // TODO: handle full room
//         }
//     } else {
//         console.log("middleware - returning player");
//     }

//     next();
// }

/* -------------------------------------------------------------------------- */
/*                              Connection Logic                               */
/* -------------------------------------------------------------------------- */

function onConnect(socket: ServerPlayerSocket) {
    console.log("Client connected");
    console.log("socket id:", socket.id);

    // console.log("player_number:", socket.data.profile.playerId);

    registerSocketEvents(socket);

    socket.on("disconnect", (reason: string) => {
        if (socket.data?.profile) {
            const { playerId } = socket.data.profile;
            if (playerId === undefined) throw new Error("unexpected error")
            connectedPlayersArr[playerId] = null;
            connectedPlayersCount--;
        }
    });

    // socket.emit("playerJoin", socket.data.profile);
}

/* -------------------------------------------------------------------------- */
/*                               Event Handlers                               */
/* -------------------------------------------------------------------------- */
type EventHandlerReturn<W extends keyof ServerToClientEvents> = [
    W,
    [...Parameters<ServerToClientEvents[W]>]
];

type EventHandler<
    IN extends keyof ClientToServerEvents,
    OUT extends keyof ServerToClientEvents
> = (...args: Parameters<ClientToServerEvents[IN]>) =>
    OUT extends OUT 
        ? [OUT, [...Parameters<ServerToClientEvents[OUT]>]]
        : never;

const getPlayerCount: EventHandler<"getPlayerCount", "playerCount"> = () => {
    // function getPlayerCount(): EventHandlerReturn {
    console.log("socket: getPlayerCount");
    // socket.emit("playerCount", connectedPlayersCount);
    return ["playerCount", [connectedPlayersCount]];
}

// const getRoomState: EventHandler<"getRoomState", > = () => {
//     const data = {
//         connectedPlayersCount: connectedPlayersCount,
//         players: connectedPlayersArr
//     };
//     console.log("socket: getRoomState");
//     return []
// }

const registerPlayer: EventHandler<"registerPlayer", "playerRegistered" | "playerNotRegistered"> = (playerProfile: Player) => {
    const availableIndex = connectedPlayersArr.findIndex(v => v === null);
    if (availableIndex == -1) {
        const reason = "room is full";
        return ["playerNotRegistered", [reason]]
    }
    console.log(`assigning seat ${availableIndex}`);
    const player: Required<Player> = {
        ...playerProfile,
        playerId: availableIndex,
        lastWord: "",
    };

    connectedPlayersCount++;
    return ["playerRegistered", [player, gameState]]
}

/* -------------------------------------------------------------------------- */
/*                              Event Registry                                */
/* -------------------------------------------------------------------------- */
const socketEvents = {
    getPlayerCount,
    registerPlayer
    // getRoomState,
};

function registerSocketEvents(socket: ServerPlayerSocket) {
    (Object.keys(socketEvents) as Array<keyof typeof socketEvents>).forEach(event => {
        const handler = socketEvents[event];
        socket.on(event, (...args: Parameters<typeof handler>) => {
            const out = handler(...args as [any]); // as [any] is just a hack, union of tuples does not support "..."
            if (out) socket.emit(out[0], ...out[1]);
        });
    });
}