import { addPlayer } from "../shared/GameState";
import { AckGetPlayerCount, AckIsReturningPlayer, AckRegisterPlayer, ClientPlayers, GameState, PlayerWithId, ServerPlayerSocket } from "../shared/types";
import { getGameState, setGameState } from "./serverGameState";

export function fml(socket: ServerPlayerSocket) {
    socket.on("getPlayerCount", (ack: AckGetPlayerCount) => {
        ack(getPlayerCount());
    });

    socket.on("isReturningPlayer", (clientId: string, ack: AckIsReturningPlayer) => {
        ack(isReturningPlayer(clientId));
    });


    socket.on("registerPlayer", (player: PlayerWithId, ack: AckRegisterPlayer) => {
        ack(registerPlayer(player));
    });

    socket.onAny(event => console.log(event));
};


const registerPlayer = (player: PlayerWithId): (
    | { success: true; gameState: GameState<ClientPlayers> }
    | { success: false; reason: string }) => {
    const newState = addPlayer(getGameState(), player);
    setGameState(newState);
    return { success: true, gameState: newState };
};

const getPlayerCount = () => getGameState().connectedPlayers;

const isReturningPlayer = (clientId: string) => {
    const player = getGameState().socketPlayerMap?.get(clientId);
    if (player === undefined) return { found: false };
    return { found: true, player: { ...player, uid: clientId } };
};