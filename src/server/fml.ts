import { progressNextTurn, registerPlayer as registerPlayerToState, removePlayer, toGameStateEmit } from "../shared/GameState";
import { socketEvents } from "../shared/socket";
import { ServerSocketContext } from "../shared/socketServer";
import { AckGetPlayerCount, AckIsReturningPlayer, AckRegisterPlayer, AckSubmitWordResponse, AckSubmitWordResponseParams, GameState, PlayerWithId, ServerPlayerSocket } from "../shared/types";
import { inputIsValid } from "../shared/utils";
import { countSocketEvent, setRegisteredClients } from "./metrics";
import { getGameState, setGameState } from "./serverGameState";

// --- Logging ---
function log(message: string, context: ServerSocketContext) {
    const entry = { ts: Date.now(), msg: `[socket] ${message}` };
    context.logs.push(entry);
    if (context.logs.length > 500) context.logs.shift();
    console.log(new Date(entry.ts).toISOString(), entry.msg);
}

// --- Client / socket helpers ---
function getClientId(socket: ServerPlayerSocket) {
    return socket.handshake.auth.clientId;
}

// --- Read-only state queries ---
const getPlayerCount = () => getGameState().connectedPlayers;

const isReturningPlayer = (clientId: string) => {
    const player = getGameState().socketPlayerMap?.get(clientId);
    if (player === undefined) return { found: false };
    return { found: true, player: { ...player, uid: clientId } };
};

// --- Broadcasting ---
function broadcastGameState(socket: ServerPlayerSocket, gameState: GameState) {
    console.log(`broadcastGameState: Broadcasting updated game state to all clients except sender. GameState:`, toGameStateEmit(gameState));
    socket.broadcast.emit("gameStateUpdate", toGameStateEmit(gameState));
}

// --- Player registration (local wrapper + reconnect + full flow) ---
const registerPlayer = (player: PlayerWithId): GameState => {
    const newState = registerPlayerToState(getGameState(), player);
    setGameState(newState);
    return newState;
};

function reconnectingPlayerSocket(socket: ServerPlayerSocket, ack: AckRegisterPlayer): boolean {
    const clientId = getClientId(socket);
    if (getGameState().socketPlayerMap?.has(clientId)) {
        const newState = getGameState();
        const player = newState.socketPlayerMap?.get(clientId);
        if (!player) throw new Error("Unexpected error; player is undefined");
        ack({ success: true, gameState: toGameStateEmit(newState), player: player });
        return true;
    }
    return false;
}

function registerPlayerSocket(socket: ServerPlayerSocket, player: PlayerWithId, ack: AckRegisterPlayer) {
    const clientId = getClientId(socket);
    const isReturningPlayerFlag = getGameState().socketPlayerMap?.has(clientId);
    if (isReturningPlayerFlag) {
        return reconnectingPlayerSocket(socket, ack);
    }

    countSocketEvent("registerPlayer");
    const newState = registerPlayer(player);
    setGameState(newState);

    const { thisPlayer } = newState;
    const clientGameState = toGameStateEmit(newState);
    if (thisPlayer === undefined) throw new Error("thisPlayer cannot be undefined here");
    newState.socketPlayerMap?.set(clientId, thisPlayer);

    setRegisteredClients(newState.socketPlayerMap?.size ?? 0);

    if (newState.connectedPlayers > 1) {
        broadcastGameState(socket, newState);
    }

    ack({ success: true, gameState: clientGameState, player: thisPlayer });
}

// --- Player removal ---
function unregisterPlayer(clientId: string) {
    const state = getGameState();
    const player = state.socketPlayerMap?.get(clientId);
    if (!player) {
        console.warn(`[unregisterPlayer] No player found for clientId=${clientId}`);
        setRegisteredClients(state.socketPlayerMap?.size ?? 0);
        return;
    }
    console.info(`[unregisterPlayer] Removing player`, { clientId, player });
    const nextState = removePlayer(state, player);
    setGameState(nextState);
    setRegisteredClients(nextState.socketPlayerMap?.size ?? 0);
    console.info(`[unregisterPlayer] Player removed`);
}

// --- Word submission ---
async function handleSubmitWord(socket: ServerPlayerSocket, word: string, ack: AckSubmitWordResponse) {
    console.log("submitWord event received from client: " + word);
    const state = getGameState();
    const currentMatchLetter = state.matchLetter.block;

    // Validate word matches the match letter
    if (word.length === 0 || word[0] !== currentMatchLetter) {
        ack({ success: false, reason: `submitWord: word doesn't match. Expected starting with: ${currentMatchLetter}, got: ${word}` });
        return;
    }

    const validWord = await inputIsValid(word);
    if (!validWord) {
        ack({ success: false, reason: `submitWord: word (${word}) is not valid` });
        return;
    }

    const block = word.slice(-1);
    const nextState = progressNextTurn(state, block, word);
    setGameState(nextState);
    const emitState = toGameStateEmit(nextState);
    broadcastGameState(socket, emitState);
    ack({ success: true, gameState: emitState });
}

// --- Main entry: attach socket handlers ---
export function fml(socket: ServerPlayerSocket, socketContext: ServerSocketContext) {
    const logger = (message: string) => log(message, socketContext);

    countSocketEvent("connect");

    socket.on("getPlayerCount", (ack: AckGetPlayerCount) => {
        countSocketEvent("getPlayerCount");
        ack(getPlayerCount());
    });

    socket.on(socketEvents.isReturningPlayer, (clientId: string, ack: AckIsReturningPlayer) => {
        ack(isReturningPlayer(clientId));
    });

    socket.on(socketEvents.registerPlayer, (player: PlayerWithId, ack: AckRegisterPlayer) => {
        registerPlayerSocket(socket, player, ack);
    });

    socket.on(socketEvents.disconnect, (reason: string) => {
        const clientId = getClientId(socket);
        console.log("disconnect event received from client: " + reason);
        countSocketEvent("disconnect");
        unregisterPlayer(clientId);
        broadcastGameState(socket, toGameStateEmit(getGameState()));
    });

    socket.on(socketEvents.submitWord, (word: string, ack: AckSubmitWordResponse) => {
        countSocketEvent("submitWord");
        handleSubmitWord(socket, word, ack);
    });

    socket.onAny(event => console.log(event));
}
