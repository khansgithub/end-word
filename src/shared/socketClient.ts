import type { ActionDispatch } from "react";
import { GameStateActionsType } from "./GameState";
import { socketEvents } from "./socket";
import type { ClientPlayerSocket, GameState, Player } from "./types";
import { isSuppress, pp } from "./utils";

const L = "socketClient: "
const log = console.log;
// const pp = isSuppress() ? () => { return "[SUPPRESS=TRUE]"; } : prettyprint;

// Used to ensure we only attach a single handler set per client socket.
const clientSocketsWithHandlers = new WeakSet<ClientPlayerSocket>();

// Wires client listeners to update the local game state based on server pushes.
export function registerClientSocketHandlers(
    socket: ClientPlayerSocket,
    state: GameState,
    dispatch: ActionDispatch<[action: GameStateActionsType]>
) {
    if (!socket.connected) {
        console.warn("Socket is not connected");
        return;
    }

    if (clientSocketsWithHandlers.has(socket)) {
        return;
    }

    clientSocketsWithHandlers.add(socket);

    socket.onAny((e => {
        log(L, "event: ", e);
    }))

    socket.on(socketEvents.connect, () => {
        log(L, `Connected to socket: ${socket.id}, ${socket.auth}`);
        // Request full state sync on reconnection to ensure we're in sync
        if (state.thisPlayer) {
            socket.emit(socketEvents.requestFullState, (serverState) => {
                dispatch({
                    type: "gameStateUpdateClient",
                    payload: [{...serverState}],
                });
            });
        }
    });

    // socket.on(socketEvents.playerCount, (count) => {
    //     dispatch({
    //         type: "updateConnectedPlayersCount",
    //         payload: [state, count],
    //     });
    // });

    // socket.on(socketEvents.playerJoinNotification, (newPlayer) => {
    //     log(L, "playerJoinNotification event received");
    //     dispatch({
    //         type: "addPlayerToArray",
    //         payload: [state, newPlayer],
    //     });
    // });

    // socket.on(socketEvents.playerLeaveNotification, (player) => {
    //     dispatch({
    //         type: "removePlayer",
    //         payload: [state, player],
    //     });
    // });

    // socket.on(socketEvents.playerRegistered, (serverState) => {
    //     log(L, "playerRegistered: dispatch, args:", pp(serverState));
    //     if (state.thisPlayer !== undefined){
    //         console.warn("socketClient - on playerRegistered event; skipping because state.thisPlayer is not empty", pp(state.thisPlayer))
    //         return;
    //     }
    //     const player = serverState.thisPlayer;
    //     dispatch({
    //         type: "addAndRegisterPlayer",
    //         payload: [state, player],
    //     });
    // });

    // socket.on(socketEvents.playerNotRegistered, (reason) => {
    //     throw new Error("handle when room is full: " + reason);
    // });

    // Handle game state updates from server (source of truth)
    socket.on(socketEvents.gameStateUpdate, (stateEmit) => {
        log(L, "gameStateUpdate received from server:", pp(stateEmit));

        // always replace the thisPlayer in the serverState with the local state thisPlayer
        // Replace local state with server state (server is source of truth)
        dispatch({
            type: "replaceGameState",
            payload: [{ ...stateEmit, thisPlayer: state.thisPlayer }],
        });
        // if (serverState.thisPlayer && (!state.thisPlayer || state.thisPlayer.uid === serverState.thisPlayer.uid)) {
        //     dispatch({
        //         type: "replaceGameState",
        //         payload: [state, serverState],
        //     });
        // } else {
        //     console.warn("gameStateUpdate: thisPlayer mismatch or missing", {
        //         server: JSON.stringify(serverState.thisPlayer),
        //         local: JSON.stringify(state.thisPlayer)
        //     });
        // }
    });

    // // Handle full state sync (e.g., on reconnection)
    // socket.on(socketEvents.fullStateSync, (serverState) => {
    //     log(L, "fullStateSync received from server:", pp(serverState));
    //     // Replace entire local state with server state
    //     if (serverState.thisPlayer && (!state.thisPlayer || state.thisPlayer.uid === serverState.thisPlayer.uid)) {
    //         dispatch({
    //             type: "replaceGameState",
    //             payload: [state, serverState],
    //         });
    //     } else {
    //         console.warn("fullStateSync: thisPlayer mismatch or missing", {
    //             server: serverState.thisPlayer,
    //             local: state.thisPlayer
    //         });
    //     }
    // });

    socket.on(socketEvents.text, (text) => {
        log(L, `Text from server: ${text}`);
    });
}


// export function redirectReturningPlayer(
//     socket: ClientPlayerSocket,
//     clientId: string,
//     redirectToRoom: (name: string) => void) {

//     socket.emit("isReturningPlayer", clientId, (({ found, player }) => {
//         log(L, "isReturningPlayer: ", found, player);
//         if (found && player) redirectToRoom(player.name);
//     }))
// }

export function socketSetReturningPlayer(
    socket: ClientPlayerSocket,
    clientId: string,
    setReturningPlayer: (player: Player) => void) {
    socket.emit("isReturningPlayer", clientId, (({ found, player }) => {
        log(L, "isReturningPlayer: ", found, player);
        if (found && player) setReturningPlayer(player);
    }));
}

export function socketGetPlayerCount(
    socket: ClientPlayerSocket,
    setPlayerCount: (count: number) => void) {
    socket.emit("getPlayerCount", (count) => {
        log(L, "getPlayerCount: ", count);
        setPlayerCount(count);
    });
}