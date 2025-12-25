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
    uid?: string;
    seat?: number
    name: string;
    lastWord?: string;
};

export type PlayersArray = FixedLengthArray<Player | null, typeof MAX_PLAYERS>;

/* --------------------------------------------------
 * Socket Event Types
 * -------------------------------------------------- */

export type SharedSocketEvents = {
    // gameUpdate: (update: Partial<GameState>) => void;
    text: (text: string) => void;
};

export type ClientToServerEvents = SharedSocketEvents & {
    getPlayerCount: () => void;
    registerPlayer: (playerProfile: Player) => void;
    unregisterPlayer: (playerProfile: Player) => void; // maybe this can be just the id?
};

export type ServerToClientEvents = SharedSocketEvents & {
    playerCount: (count: number) => void;
    playerJoinNotification: (newPlayer: Player) => void;
    playerLeaveNotification: (player: Player) => void;
    playerRegistered: (gameState: Required<GameState>) => void;
    playerNotRegistered: (reason: string) => void;
};

/* --------------------------------------------------
 * Socket Types
 * -------------------------------------------------- */

export type SocketProperties = {
    profile?: Player;
};

export type ServerPlayerSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketProperties>;
export type ClientPlayerSocket = SocketClient<ServerToClientEvents, ClientToServerEvents>;

/* --------------------------------------------------
 * Game States
 * -------------------------------------------------- */
export type GameStatus = "waiting" | "playing" | "finished" | null;

export type MatchLetter = {
    block: string
    steps: Array<string>
    value: string
    next: number
}

export type GameState = {
    thisPlayer?: Required<Player>, // optional for the server
    matchLetter: MatchLetter,
    status: GameStatus,
    players: PlayersArray
    connectedPlayers: number
    turn: number,
};

export type GameStateFrozen = Readonly<GameState>