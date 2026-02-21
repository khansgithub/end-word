import { buildInitialGameState, decreasePlayerHealth, endGame, getPlayerByClientId, nextTurn, progressNextTurn, registerPlayer as registerPlayerToState, removePlayer, socketToSeat, toGameStateEmit } from "../shared/GameState";
import { assertIsPlayerWithId } from "../shared/guards";
import { socketEvents } from "../shared/socketEvents";
import { AckGetPlayerCount, AckIsReturningPlayer, AckRegisterPlayer, AckSubmitWordResponse, GameState, PlayerWithId, ServerPlayerSocket } from "../shared/types";
import { getAlivePlayerCount, pp } from "../shared/utils";
import { countSocketEvent, setRegisteredClients } from "./metrics";
import { getServerSocketContext, ServerSocketContext } from "./context";
import { getGameState, setGameState } from "./state";
import { getRandomWordFromDictionary } from "./api";
import { log } from "./logging";
import { inputIsValid } from "./utils";

const L = "socketHandler: ";

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
    log("[broadcastGameState] Broadcasting updated game state to all clients except sender. GameState:", pp(toGameStateEmit(gameState)))();
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

    broadcastGameState(socket, newState);

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
    log(L, `submitWord event received from client ${getClientId(socket)}`)();
    const player = getPlayerByClientId(getGameState(), getClientId(socket));
    log(L, `player: ${JSON.stringify(player)}`)();
    log(L, `word: ${word}`)();
    const state = getGameState();
    const currentMatchLetter = state.matchLetter.block;

    // Validate word matches the match letter
    if (word.length === 0 || word[0] !== currentMatchLetter) {
        const reason = `submitWord: word doesn't match. Expected starting with: ${currentMatchLetter}, got: ${word}`;
        invalidWord(socket, reason, ack);
        return;
    }

    const validWord = await inputIsValid(word);
    if (validWord === false) {
        const reason = `submitWord: word (${word}) is not valid`;
        invalidWord(socket, reason, ack);
        return;
    }

    const block = word.slice(-1);
    const nextState = progressNextTurn(state, block, word);
    setGameState(nextState);
    const emitState = toGameStateEmit(nextState);
    broadcastGameState(socket, emitState);
    // socket.broadcast.emit("wordDefinition", validWord[1]);
    getServerSocketContext()?.io?.emit("wordDefinition", validWord[1]);
    ack({ success: true, gameState: emitState });
}
/**
 * Invoked during a submit word event, when the input word is invalid.
 * Calls the ack function with the reason for the word being invalid.
 * Reduces player health by 1 down to 0.
 * If there are only 2 players left, and one dies, game is over. state.status set to "finished"
 */
export function invalidWord(socket: ServerPlayerSocket, reason: string, ack: AckSubmitWordResponse) {
    const state = getGameState();
    const clientId = getClientId(socket);
    const player = getPlayerByClientId(state, clientId);
    if (!player) throw new Error("Unexpected error; player is undefined");
    const playerDead = player.health == 1;
    const end = playerDead && getAlivePlayerCount(state) == 2;


    let nextState: GameState = decreasePlayerHealth(state, player.health, player.seat!);
    if (end) {
        nextState = endGame(nextState);
        resetGameState()
        socket.removeAllListeners();
    }
    else if (playerDead) nextState = nextTurn(nextState);

    // setGameState(nextState);
    broadcastGameState(socket, nextState);
    ack({
        success: false,
        reason: reason,
        ... (end || playerDead ? { gameState: toGameStateEmit(nextState) } : {})
    });
}

/**
 * Totally resets the game state as if the server just started.
 * Fetches a new random word, builds fresh initial state, clears metrics, and disconnects all clients.
 */
export async function resetGameState(): Promise<void> {
    const word = await getRandomWordFromDictionary();
    const newState = buildInitialGameState(word.slice(-1));
    setGameState(newState);
    setRegisteredClients(0);
    const ctx = getServerSocketContext();
    ctx?.io?.disconnectSockets();
}

// --- Main entry: attach socket handlers ---
export function fml(socket: ServerPlayerSocket, socketContext: ServerSocketContext) {
    countSocketEvent("connect");

    socket.on(socketEvents.getPlayerCount, (ack: AckGetPlayerCount) => {
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
        log("disconnect event received from client: " + reason)();
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

    socket.onAny(event => log(event)());
}
