import { decreasePlayerHealth, endGame, getPlayerByClientId, progressNextTurn, registerPlayer as registerPlayerToState, removePlayer, socketToSeat, toGameStateEmit } from "../shared/GameState";
import { assertIsPlayerWithId } from "../shared/guards";
import { socketEvents } from "../shared/socket";
import { AckGetPlayerCount, AckIsReturningPlayer, AckRegisterPlayer, AckSubmitWordResponse, GameState, PlayerWithId, ServerPlayerSocket } from "../shared/types";
import { inputIsValid } from "../shared/utils";
import { countSocketEvent, setRegisteredClients } from "./metrics";
import { getServerSocketContext, ServerSocketContext } from "./serverContext";
import { getGameState, setGameState } from "./serverGameState";

const L = "fml: ";
const _log = console.log;
const log2 = (...args: any[]) => {
    const context = getServerSocketContext();
    if (context) serverLog(context, args);
    return console.log;
}

// --- Logging ---
function serverLog(context: ServerSocketContext, ...messages: any[]) {
    const entry = { ts: Date.now(), msg: `[socket] ${messages}` };
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
    const state = getGameState();
    const seat = socketToSeat(state, clientId);
    if (seat === false) return { found: false };
    const player = state.players[seat];
    if (!player) return { found: false };
    return { found: true, player: { ...player, uid: clientId } };
};

// --- Broadcasting ---
export function broadcastGameState(socket: ServerPlayerSocket, gameState: GameState) {
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
    const state = getGameState();
    const playerSeat = socketToSeat(state, clientId);
    if (playerSeat != false) {
        const newState = getGameState();
        const player = newState.players[playerSeat];
        if (!player) throw new Error("Unexpected error; player is undefined");
        assertIsPlayerWithId(player);
        ack({ success: true, gameState: toGameStateEmit(newState), player: player });
        return true;
    }
    return false;
}

function registerPlayerSocket(socket: ServerPlayerSocket, player: PlayerWithId, ack: AckRegisterPlayer) {
    const clientId = getClientId(socket);
    const isReturningPlayerFlag = socketToSeat(getGameState(), clientId);
    if (isReturningPlayerFlag !== false) {
        return reconnectingPlayerSocket(socket, ack);
    }

    countSocketEvent("registerPlayer");
    const newState = registerPlayer(player);
    setGameState(newState);

    const { thisPlayer } = newState;
    const clientGameState = toGameStateEmit(newState);
    if (thisPlayer === undefined) throw new Error("thisPlayer cannot be undefined here");
    assertIsPlayerWithId(thisPlayer);
    if (thisPlayer.seat === undefined) throw new Error("seat must be assigned before adding to socketPlayerMap");
    newState.socketPlayerMap?.set(clientId, thisPlayer.seat);

    setRegisteredClients(newState.socketPlayerMap?.size ?? 0);

    if (newState.connectedPlayers > 1) {
        broadcastGameState(socket, newState);
    }

    ack({ success: true, gameState: clientGameState, player: thisPlayer });
}

// --- Player removal ---
function unregisterPlayer(clientId: string) {
    const state = getGameState();
    const player = getPlayerByClientId(state, clientId);
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
/**
 * The player is derived from state.socketPlayerMap using the the clientID
 * @param socket 
 * @param word 
 * @param ack 
 * @returns 
 */
export async function handleSubmitWord(socket: ServerPlayerSocket, word: string, ack: AckSubmitWordResponse) {
    console.log(L, `submitWord event received from client ${getClientId(socket)}`);
    const player = getPlayerByClientId(getGameState(), getClientId(socket));
    console.log(L, `player: ${JSON.stringify(player)}`);
    console.log(L, `word: ${word}`);
    const state = getGameState();
    const currentMatchLetter = state.matchLetter.block;

    // Validate word matches the match letter
    if (word.length === 0 || word[0] !== currentMatchLetter) {
        const reason = `submitWord: word doesn't match. Expected starting with: ${currentMatchLetter}, got: ${word}`;
        invalidWord(socket, reason, ack);
        return;
    }

    const validWord = await inputIsValid(word);
    if (!validWord) {
        const reason = `submitWord: word (${word}) is not valid`;
        invalidWord(socket, reason, ack);
        return;
    }

    const block = word.slice(-1);
    const nextState = progressNextTurn(state, block, word);
    setGameState(nextState);
    const emitState = toGameStateEmit(nextState);
    broadcastGameState(socket, emitState);
    ack({ success: true, gameState: emitState });
}

function invalidWord(socket: ServerPlayerSocket, reason: string, ack: AckSubmitWordResponse) {
    /**
     * Invoked during a submit word event, when the input word is invalid.
     * Calls the ack function with the reason for the word being invalid.
     * Also reduces the player health by one.
     */

    const state = getGameState();
    const clientId = getClientId(socket);
    const player = getPlayerByClientId(state, clientId);
    if (!player) throw new Error("Unexpected error; player is undefined");
    const end = player.health == 1;

    // FIXME: This is logic assuming the game is for just 2 players.
    // Need to handle skipping players who have lost in games with > 2 players.
    const nextState =
        end
            ? endGame(state)
            : decreasePlayerHealth(
                  state,
                  player.health,
                  player.seat!
              );

    if (end){
        // purgeGameState();
    }

    setGameState(nextState);
    broadcastGameState(socket, nextState);
    ack({ success: false, reason: reason, ... end ? {endGameState: toGameStateEmit(nextState)} : {}});
}

// --- Main entry: attach socket handlers ---
export function fml(socket: ServerPlayerSocket, socketContext: ServerSocketContext) {
    const logger = (message: string) => serverLog(socketContext, message);

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

        if (getGameState().connectedPlayers === 0) {
            setGameState({ ...getGameState(), status: "waiting", turn: 0 });
        }
    });

    socket.on(socketEvents.submitWord, (word: string, ack: AckSubmitWordResponse) => {
        countSocketEvent("submitWord");
        handleSubmitWord(socket, word, ack);
    });

    socket.onAny(event => console.log(event));
}
