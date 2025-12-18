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
    lastWord?: string;
};

export type PlayersArray = FixedLengthArray<Player | null, typeof MAX_PLAYERS>;

/* --------------------------------------------------
 * Socket Event Types
 * -------------------------------------------------- */

export type SharedSocketEvents = {
    // playerJoin: (playerProfile: Player) => void;
    gameUpdate: (update: Partial<GameState>) => void;
};

export type ClientToServerEvents = SharedSocketEvents & {
    getPlayerCount: () => void;
    // getRoomState: () => void;
    registerPlayer: (playerProfile: Player) => void;
};

export type ServerToClientEvents = SharedSocketEvents & {
    playerCount: (count: number) => void;
    playerRegistered: (player: Required<Player>, gameState: GameState) => void;
    playerNotRegistered: (reason: string) => void;
};

/* --------------------------------------------------
 * Socket Types
 * -------------------------------------------------- */

export type SocketProperties = {
    profile?: Player;
};

export type ServerPlayerSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketProperties>;
export type ClientPlayerSocket = SocketClient<ServerToClientEvents, ClientToServerEvents>;

/* --------------------------------------------------
 * Game States
 * -------------------------------------------------- */
export type GameStatus = "waiting" | "playing" | "finished";

export type MatchLetter = {
    block: string
    steps: Array<string>
    value: string
    next: number
}

export type GameState = Readonly<{
    thisPlayer?: Player, // optional for the server
    matchLetter: MatchLetter,
    status: GameStatus,
    players: PlayersArray
    connectedPlayers: number
    turn: number,
}>;