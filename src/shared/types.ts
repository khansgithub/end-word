import { Socket } from "socket.io";
import { Socket as SocketClient } from "socket.io-client";
import { MAX_PLAYERS } from "./consts";

/* --------------------------------------------------
 * Utility Types
 * -------------------------------------------------- */

export type FixedLengthArray<T, L extends number> = T[] & { length: L };

/* --------------------------------------------------
 * Player Types
 * -------------------------------------------------- */

export type Player = {
    name: string;
    lastWord: string;
};

// export type EmptyPlayersArray = FixedLengthArray<null, typeof MAX_PLAYERS>;
// export type PlayersArray = FixedLengthArray<Player, typeof MAX_PLAYERS>;

export type PlayerProfile = {
    playerId: number;
    name?: string;
};

export type PlayersArray = [
    Player?,
    Player?,
    Player?,
    Player?,
    Player?,
];

/* --------------------------------------------------
 * Socket Event Types
 * -------------------------------------------------- */

export type SocketEvents = {
    playerJoin: (playerProfile: PlayerProfile) => void;
};

export type ClientToServerEvents = SocketEvents & {
    getPlayerCount: () => void;
    getRoomState: () => void;
};

export type ServerToClientEvents = SocketEvents & {
    playerCount: (count: number) => void;
};

/* --------------------------------------------------
 * Socket Types
 * -------------------------------------------------- */

export type SocketProperties = {
    profile: PlayerProfile;
};

export type ServerPlayerSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketProperties
>;

export type ClientPlayerSocket = SocketClient<
    ServerToClientEvents,
    ClientToServerEvents
>;
