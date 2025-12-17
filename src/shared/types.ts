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
    playerId?: number
    name: string;
    lastWord: string;
};

export type PlayersArray = FixedLengthArray<Player | null, typeof MAX_PLAYERS>;

/* --------------------------------------------------
 * Socket Event Types
 * -------------------------------------------------- */

export type SocketEvents = {
    playerJoin: (playerProfile: Player) => void;
    gameUpdate: (update: Partial<GameState>) => void;
};

export type ClientToServerEvents = SocketEvents & {
    getPlayerCount: () => void;
    getRoomState: () => void;
    registerPlayer: (playerProfile: Player) => void;
};

export type ServerToClientEvents = SocketEvents & {
    playerCount: (count: number) => void;
    playerRegistered: (player: Required<Player>, gameState: GameState) => void;
};

/* --------------------------------------------------
 * Socket Types
 * -------------------------------------------------- */

export type SocketProperties = {
    profile?: Player;
};

export type ServerPlayerSocket = Socket<ClientToServerEvents,ServerToClientEvents,{},SocketProperties>;
export type ClientPlayerSocket = SocketClient<ServerToClientEvents,ClientToServerEvents>;

/* --------------------------------------------------
 * Game States
 * -------------------------------------------------- */

export type MatchLetter = {
    block: string
    steps: Array<string>
    value: string
    next: number
}

export type GameState = {
    // Tracks the expected Hangul block + its decomposition steps + current step index
    // Example:
    //   block: "각"
    //   steps: ["ㄱ", "가", "각"]
    //   next: 1 (next step the user must type)
    matchLetter: MatchLetter,
    players: PlayersArray
    connectedPlayers: number
    turn: number,
}