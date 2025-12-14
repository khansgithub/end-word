import { Socket } from "socket.io";

export type PlayerProfile = {
    playerId: number
    name: string,
};

type SocketEvents = {
    "playerJoin": (playerProfile: PlayerProfile) => void;
}

export type ClientToServerEvents = {} & SocketEvents;
export type ServerToClientEvents = {} & SocketEvents;

export type SocketProperties = {
    profile: PlayerProfile
};

export type PlayerSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketProperties>;


export type FixedLengthArray<T, L extends number> = T[] & { length: L };