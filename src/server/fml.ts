import { gameStateReducer } from "../shared/GameState";
import { ClientPlayers, ClientToServerEvents, GameState, PlayerWithId, ServerPlayerSocket } from "../shared/types";
import { getGameState, setGameState } from "./serverGameState";

export function fml(socket: ServerPlayerSocket) {
    socket.on("getPlayerCount", (ack: (count: number) => void) => {
        ack(getPlayerCount());
    });

    socket.on("isReturningPlayer", (clientId: string, ack: (response: { found: boolean; player?: PlayerWithId }) => void) => {
        ack(isReturningPlayer(clientId));
    });


    socket.on("registerPlayer", (player: PlayerWithId, ack: (response: { success: true; gameState: Required<GameState<ClientPlayers>> } | { success: false; reason: string }) => void) => {
        ack(registerPlayer(player));
    });

    socket.onAny(event => console.log(event));
};


const registerPlayer = (player: PlayerWithId): (
    | { success: true; gameState: GameState<ClientPlayers> }
    | { success: false; reason: string }) => {
    const newState = gameStateReducer(getGameState(), {
        type: "addPlayer",
        payload: [getGameState(), player] as const,
    });
    setGameState(newState);
    return { success: true, gameState: newState };
};
const getPlayerCount = () => getGameState().connectedPlayers;

const isReturningPlayer = (clientId: string) => {
    const player = getGameState().socketPlayerMap?.get(clientId);
    if (player === undefined) return { found: false };
    return { found: true, player: { ...player, uid: clientId } };
};