import { progressNextTurn, registerPlayer as registerPlayerToState, removePlayer, toGameStateClient } from "../shared/GameState";
import { socketEvents } from "../shared/socket";
import { AckGetPlayerCount, AckIsReturningPlayer, AckRegisterPlayer, AckRegisterPlayerResponse, AckSubmitWord, ClientPlayers, GameState, GameStateClient, GameStateServer, PlayerWithId, ServerPlayerSocket } from "../shared/types";
import { getCurrentPlayerIndex, inputIsValid } from "../shared/utils";
import { getGameState, setGameState } from "./serverGameState";
import { ServerSocketContext } from "../shared/socketServer";

function log(message: string, context: ServerSocketContext) {
    const entry = { ts: Date.now(), msg: `[socket] ${message}` };
    context.logs.push(entry);
    if (context.logs.length > 500) context.logs.shift();
    console.log(new Date(entry.ts).toISOString(), entry.msg);
}

export function fml(socket: ServerPlayerSocket, socketContext: ServerSocketContext) {
    const logger = (message: string) => log(message, socketContext);
    socket.on("getPlayerCount", (ack: AckGetPlayerCount) => {
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
        unregisterPlayer(clientId);
    });


    socket.on(socketEvents.submitWord, (word: string, ack: AckSubmitWord) => {
        handleSubmitWord(socket, word, ack);
    });

    socket.onAny(event => console.log(event));
};

function unregisterPlayer(clientId: string){
    const state = getGameState();
    const player = state.socketPlayerMap?.get(clientId);
    if (!player) {
        console.warn(`[unregisterPlayer] No player found for clientId=${clientId}`);
        return;
    }
    console.info(`[unregisterPlayer] Removing player`, { clientId, player });
    const nextState = removePlayer(state, player);
    setGameState(nextState);
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

    const clientState = toGameStateClient(nextState);
    broadcastGameState(socket, clientState);
    socket.emit("gameStateUpdate", clientState);
    ack({ success: true, gameState: clientState});
    // submitWord(socket, word, ack);
}

function registerPlayerSocket(socket: ServerPlayerSocket, player: PlayerWithId, ack: AckRegisterPlayer) {
    const clientId = getClientId(socket);
    const isReturningPlayer = getGameState().socketPlayerMap?.has(clientId);
    // const isReturningPlayer = reconnectingPlayerSocket(socket, ack);
    if (isReturningPlayer){
        return reconnectingPlayerSocket(socket, ack);
    };

    const newState = registerPlayer(player);
    setGameState(newState);

    const {thisPlayer} = newState;
    const clientGameState = toGameStateClient(newState);
    if (thisPlayer === undefined) throw new Error("thisPlayer cannot be undefined here");
    newState.socketPlayerMap?.set(clientId, thisPlayer);

    if(newState.connectedPlayers > 1){
        broadcastGameState(socket, newState);
    }

    ack({ success: true, gameState: clientGameState });
}

function reconnectingPlayerSocket(socket: ServerPlayerSocket, ack: AckRegisterPlayer): boolean {
    const clientId = getClientId(socket);
    if (getGameState().socketPlayerMap?.has(clientId)) {
        const newState = getGameState();
        newState.thisPlayer = newState.socketPlayerMap?.get(clientId);
        ack({success: true, gameState: toGameStateClient(newState)});
        return true;
    }
    return false;
}

function broadcastGameState(socket: ServerPlayerSocket, gameState: GameState){
    console.log(`broadcastGameState: Broadcasting updated game state to all clients except sender. GameState:`, toGameStateClient(gameState));
    socket.broadcast.emit("gameStateUpdate", toGameStateClient(gameState));
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