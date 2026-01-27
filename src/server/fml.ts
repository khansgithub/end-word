import { registerPlayer as registerPlayerToState, toGameStateClient } from "../shared/GameState";
import { AckGetPlayerCount, AckIsReturningPlayer, AckRegisterPlayer, AckRegisterPlayerResponse, ClientPlayers, GameState, GameStateClient, GameStateServer, PlayerWithId, ServerPlayerSocket } from "../shared/types";
import { getGameState, setGameState } from "./serverGameState";

export function fml(socket: ServerPlayerSocket) {
    socket.on("getPlayerCount", (ack: AckGetPlayerCount) => {
        ack(getPlayerCount());
    });

    socket.on("isReturningPlayer", (clientId: string, ack: AckIsReturningPlayer) => {
        ack(isReturningPlayer(clientId));
    });


    socket.on("registerPlayer", (player: PlayerWithId, ack: AckRegisterPlayer) => {
        registerPlayerSocket(socket, player, ack);
    });

    socket.onAny(event => console.log(event));
};

function registerPlayerSocket(socket: ServerPlayerSocket, player: PlayerWithId, ack: AckRegisterPlayer) {
    const isReturningPlayer = getGameState().socketPlayerMap?.has(`${socket.id}`);
    // const isReturningPlayer = reconnectingPlayerSocket(socket, ack);
    if (isReturningPlayer){
        return reconnectingPlayerSocket(socket, ack);
    };

    const newState = registerPlayer(player);
    setGameState(newState);

    const {thisPlayer} = newState;
    const clientGameState = toGameStateClient(newState);
    if (thisPlayer === undefined) throw new Error("thisPlayer cannot be undefined here");
    newState.socketPlayerMap?.set(`${socket.id}`, thisPlayer);

    if(newState.connectedPlayers > 1){
        broadcastGameState(socket, newState);
    }

    ack({ success: true, gameState: clientGameState });
}

function reconnectingPlayerSocket(socket: ServerPlayerSocket, ack: AckRegisterPlayer): boolean {
    if (getGameState().socketPlayerMap?.has(`${socket.id}`)) {
        const newState = getGameState();
        newState.thisPlayer = newState.socketPlayerMap?.get(`${socket.id}`);
        ack({success: true, gameState: toGameStateClient(newState)});
        return true;
    }
    return false;
}

function broadcastGameState(socket: ServerPlayerSocket, gameState: GameState){
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