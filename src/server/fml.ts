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
        const newState = registerPlayer(player);
        const thisPlayer = newState.thisPlayer;
        if (thisPlayer === undefined) throw new Error("thisPlayer cannot be undefined here");
        newState.socketPlayerMap?.set(`${socket.id}`, thisPlayer);
        ack({ success: true, gameState: toGameStateClient(newState) });
    });

    socket.onAny(event => console.log(event));
};


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