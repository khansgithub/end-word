import { progressNextTurn, registerPlayer as registerPlayerToState, removePlayer, toGameStateEmit } from "../shared/GameState";
import { socketEvents } from "../shared/socket";
import { ServerSocketContext } from "../shared/socketServer";
import { AckGetPlayerCount, AckIsReturningPlayer, AckRegisterPlayer, AckSubmitWord, GameState, PlayerWithId, ServerPlayerSocket } from "../shared/types";
import { inputIsValid } from "../shared/utils";
import { countSocketEvent, setRegisteredClients } from "./metrics";
import { getGameState, setGameState } from "./serverGameState";

function log(message: string, context: ServerSocketContext) {
    const entry = { ts: Date.now(), msg: `[socket] ${message}` };
    context.logs.push(entry);
    if (context.logs.length > 500) context.logs.shift();
    console.log(new Date(entry.ts).toISOString(), entry.msg);
}

export function fml(socket: ServerPlayerSocket, socketContext: ServerSocketContext) {
    const logger = (message: string) => log(message, socketContext);
    
    // Track socket connection
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
    });


    socket.on(socketEvents.submitWord, (word: string, ack: AckSubmitWord) => {
        countSocketEvent("submitWord");
        handleSubmitWord(socket, word, ack);
    });

    socket.onAny(event => console.log(event));
};

function unregisterPlayer(clientId: string){
    const state = getGameState();
    const player = state.socketPlayerMap?.get(clientId);
    if (!player) {
        console.warn(`[unregisterPlayer] No player found for clientId=${clientId}`);
        // Still update metrics to reflect current state (in case of race conditions)
        setRegisteredClients(state.socketPlayerMap?.size ?? 0);
        return;
    }
    console.info(`[unregisterPlayer] Removing player`, { clientId, player });
    const nextState = removePlayer(state, player);
    setGameState(nextState);
    // Update metrics with new registered clients count
    setRegisteredClients(nextState.socketPlayerMap?.size ?? 0);
    console.info(`[unregisterPlayer] Player removed`);
}

async function handleSubmitWord(socket: ServerPlayerSocket, word: string, ack: AckSubmitWord) {
    console.log("submitWord event received from client: " + word);
    const state = getGameState();
    const currentMatchLetter = state.matchLetter.block;
    
    if (word.length === 0 || word[0] !== currentMatchLetter) {
        console.log(`submitWord: word doesn't match. Expected starting with: ${currentMatchLetter}, got: ${word}`);
        return;
    }

    // Check word is valid
    const validWord = await inputIsValid(word);
    if (!validWord) {
        console.log(`submitWord: word is not valid`);
        return;
    }

    // Update game state on server (source of truth)
    const block = word.slice(-1);
    const nextState = progressNextTurn(state, block, word);
    setGameState(nextState);

    const emitState = toGameStateEmit(nextState);
    broadcastGameState(socket, emitState);
    socket.emit("gameStateUpdate", emitState);
    ack({ success: true, gameState: emitState});
    // submitWord(socket, word, ack);
}

function registerPlayerSocket(socket: ServerPlayerSocket, player: PlayerWithId, ack: AckRegisterPlayer) {
    const clientId = getClientId(socket);
    const isReturningPlayer = getGameState().socketPlayerMap?.has(clientId);
    // const isReturningPlayer = reconnectingPlayerSocket(socket, ack);
    if (isReturningPlayer){
        return reconnectingPlayerSocket(socket, ack);
    };

    countSocketEvent("registerPlayer");
    const newState = registerPlayer(player);
    setGameState(newState);

    const {thisPlayer} = newState;
    const clientGameState = toGameStateEmit(newState);
    if (thisPlayer === undefined) throw new Error("thisPlayer cannot be undefined here");
    newState.socketPlayerMap?.set(clientId, thisPlayer);

    // Update metrics with new registered clients count
    setRegisteredClients(newState.socketPlayerMap?.size ?? 0);

    if(newState.connectedPlayers > 1){
        broadcastGameState(socket, newState);
    }

    ack({ success: true, gameState: clientGameState, player: thisPlayer });
}

function reconnectingPlayerSocket(socket: ServerPlayerSocket, ack: AckRegisterPlayer): boolean {
    const clientId = getClientId(socket);
    if (getGameState().socketPlayerMap?.has(clientId)) {
        const newState = getGameState();
        const player = newState.socketPlayerMap?.get(clientId);
        if (!player) throw new Error("Unexpected error; player is undefined");
        ack({success: true, gameState: toGameStateEmit(newState), player: player});
        return true;
    }
    return false;
}

function broadcastGameState(socket: ServerPlayerSocket, gameState: GameState){
    console.log(`broadcastGameState: Broadcasting updated game state to all clients except sender. GameState:`, toGameStateEmit(gameState));
    socket.broadcast.emit("gameStateUpdate", toGameStateEmit(gameState));
}

const registerPlayer = (player: PlayerWithId): GameState => {
    const newState = registerPlayerToState(getGameState(), player);

    setGameState(newState);
    return newState;
    // return { success: true, gameState: newState };
};

const getPlayerCount = () => getGameState().connectedPlayers;

const isReturningPlayer = (clientId: string) => {
    const player = getGameState().socketPlayerMap?.get(clientId);
    if (player === undefined) return { found: false };
    return { found: true, player: { ...player, uid: clientId } };
};

function getClientId(socket: ServerPlayerSocket) {
    return socket.handshake.auth.clientId;
}