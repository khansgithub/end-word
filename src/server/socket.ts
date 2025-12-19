import http from "http";
import { Server as SocketServer } from "socket.io";

import { MAX_PLAYERS } from "../shared/consts";
import { buildInitialGameState, gameStateReducer } from "../shared/GameState";
import {
    ClientToServerEvents,
    GameState,
    GameStatus,
    Player,
    PlayersArray,
    ServerPlayerSocket,
    ServerToClientEvents,
} from "../shared/types";

/* -------------------------------------------------------------------------- */
/*                                   State                                    */
/* -------------------------------------------------------------------------- */

var gameState = buildInitialGameState();

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
    io.on("connection", onConnect);
    return io;
}

/* -------------------------------------------------------------------------- */
/*                              Connection Logic                               */
/* -------------------------------------------------------------------------- */

function onConnect(socket: ServerPlayerSocket) {
    console.log("Client connected");
    console.log("socket id:", socket.id);
    console.log("connectedPlayersArr", gameState.players);

    socket.onAny((eventName, args) => {
        console.log(`event -> ${eventName}`)
        console.log("connectedPlayersArr", gameState.players);

    });

    registerSocketEvents(socket);

    socket.on("disconnect", (reason: string) => {
        if (socket.data?.profile) {
            console.log(`${socket.id} -> disconnect`)
            const { playerId } = socket.data.profile;
            if (playerId === undefined) throw new Error("unexpected error");
            
            const profile = gameState.players[playerId];
            if (profile === null) throw new Error("unexpected error");

            gameState = gameStateReducer(gameState, {
                type: "playerLeave",
                payload: {
                    players: gameState.players,
                    profile: profile
                }
            })
        }
    });
}



/* -------------------------------------------------------------------------- */
/*                              Event Registry                                */
/* -------------------------------------------------------------------------- */

function registerSocketEvents(socket: ServerPlayerSocket) {
    (Object.keys(socketEvents) as Array<keyof typeof socketEvents>).forEach(event => {
        const handler = socketEvents[event];
        socket.on(event, (...args: Parameters<typeof handler>) => {
            const out = handler(...args as [any]); // as [any] is just a hack, union of tuples does not support "..."
            if (out) socket.emit(out[0], ...out[1]);
        });
    });
}

/* -------------------------------------------------------------------------- */
/*                               Event Handlers                               */
/* -------------------------------------------------------------------------- */
type EventHandler<
    IN extends keyof ClientToServerEvents,
    OUT extends (keyof ServerToClientEvents) | void
> = (...args: Parameters<ClientToServerEvents[IN]>) =>
        OUT extends OUT & keyof ServerToClientEvents
        ? [OUT, [...Parameters<ServerToClientEvents[OUT]>]]
        : undefined;

const getPlayerCount: EventHandler<"getPlayerCount", "playerCount"> = () => {
    console.log(`socket: getPlayerCount: ${gameState.connectedPlayers}`);
    return ["playerCount", [gameState.connectedPlayers]];
}

const registerPlayer: EventHandler<"registerPlayer", "playerRegistered" | "playerNotRegistered"> = (playerProfile: Player) => {
    const availableIndex = gameState.players.findIndex(v => v === null);
    if (availableIndex == -1) {
        const reason = "room is full";
        return ["playerNotRegistered", [reason]]
    }

    // FIXME: this will cause race conditions
    gameState = gameStateReducer(gameState,{
        type: "playerJoin",
        payload: {
            players: gameState.players,
            profile: playerProfile,
        }
    });
    console.log(`assigning seat ${availableIndex}`);

    const gameStatus: GameStatus = connectedPlayersCount > 1 ? "playing" : null;

    const player: Required<Player> = {
        ...playerProfile,
        playerId: availableIndex,
        lastWord: "",
    };

    const gameState_: Required<GameState> = {
        ...gameState,
        thisPlayer: player,
        status: gameStatus
    }

    return ["playerRegistered", [gameState_]]
}

const text: EventHandler<"text", undefined> = (text: string) => {
    console.log(`server: got text from client: ${text}`);
}


const socketEvents = {
    getPlayerCount,
    registerPlayer,
    text
    // getRoomState,
};
