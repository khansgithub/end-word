import { Rooms } from '@/app/types';
import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketServer, Socket } from 'socket.io';

const rooms: Rooms = new Map<string, {count: 1 | 2}>();
type ws_action = "";

export function getRooms(): typeof rooms{
    return rooms;
}

export function createIOServer(server: http.Server): SocketServer {
    return setUpIOServer(new SocketServer(server, {
        cors: { origin: "*" }
    }));
};

export function setUpIOServer(io: SocketServer): SocketServer {
    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        socket.emit('welcome', 'Welcome to the Socket.IO server!');

        socket.on('message', (msg: string) => {
            console.log(`Message from ${socket.id}: ${msg}`);
            socket.emit('reply', `Server received: ${msg}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
    return io;
}