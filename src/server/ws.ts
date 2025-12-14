import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketServer, Socket, ExtendedError } from 'socket.io';
import { FixedLengthArray } from './types';
import { MAX_PLAYERS } from './consts';
import { PlayerSocket } from './types';

const connectedPlayersArr: FixedLengthArray<Socket | null, typeof MAX_PLAYERS> = [null,null,null,null,null,];
var connectPlayersCount = 0;

export function createIOServer(server: http.Server): SocketServer {
    return setUpIOServer(new SocketServer(server, {
        cors: { origin: "*" }
    }));
};

export function setUpIOServer(IO: SocketServer) {

    function middleware(socket: PlayerSocket, next: (err?: ExtendedError) => void) {
        const playerId = socket.data.profile.playerId;
        console.log(`middleware - player id is ${playerId}`);

        if (!playerId){
            console.log(`middleware - player is new`);
            const avaiableSpaceIndex = connectedPlayersArr.findIndex((v) => v.data.playerId == playerId);
            if (avaiableSpaceIndex >= 0){
                console.log(`middleware - player given new seat at ${avaiableSpaceIndex}`);
                socket.data.profile.playerId = avaiableSpaceIndex;
            } else {
                console.log(`middleware - room is full`);
                // room full
            }
        } else {
            console.log(`middleware - player is not new`);
            // player is already in the room.
        }
        return next();

        // const player_i = connectedPlayersArr.findIndex(x => x === undefined);

        // if (player_i == -1) {
        //     console.log("Max users reached");
        //     socket.emit("roomFull");
        //     return next();
        // }

        // socket_player[player_i] = socket;
        // socket.data.player_number = player_i as 0 | 1;
        // console.log(socket.id, "->", player_i, socket.data.player_number);
        // socket.join(room_name);
        // return next();
    }

    function onConnection(socket: PlayerSocket) {
        console.log("Client connected");
        console.log("player_number: ", socket.data.profile.playerId);
        console.log("id: ", socket.id);
        console.log("Event names", socket.eventNames());

        // if (socket.data.player_number == 0) {
        //     // the 2nd player joins
        //     console.log("Second player has joined");
        //     socket.emit("swapCharacter");
        // }

        socket.emit("playerJoin", socket.data.profile);

        // socket.emit("text", `You are player: ${socket.data.player_number}`)
    }

    function onEvent() { }



    const events = {
        event: onEvent
    };

    IO.use((socket, next) => {
        middleware(socket, next);
    });

    IO.on("connection", socket => {
        onConnection(socket);
        Object.keys(events).forEach(event => {
            socket.on(event, events[event]);
        });
    });

    return IO;
}

function _otherSocket(socket: ChatSocket): ChatSocket {
    const s = socket_player[flip(socket.data.player_number)];
    if (!s) throw new Error("Socket not found");
    return s;
}

