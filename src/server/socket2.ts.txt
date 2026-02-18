// import http from "http";
// import { Server as SocketServer } from "socket.io";

// import { MAX_PLAYERS } from "../shared/consts";
// import { buildInitialGameState, gameStateReducer } from "../shared/GameState";
// import {
//     ClientToServerEvents,
//     GameState,
//     GameStatus,
//     Player,
//     PlayersArray,
//     ServerPlayerSocket,
//     ServerToClientEvents,
// } from "../shared/types";

// /* -------------------------------------------------------------------------- */
// /*                                   State                                    */
// /* -------------------------------------------------------------------------- */

// var gameState = buildInitialGameState();

// /* -------------------------------------------------------------------------- */
// /*                               Server Factory                               */
// /* -------------------------------------------------------------------------- */

// export function createIOServer(server: http.Server): SocketServer {
//     const io = new SocketServer(server, {
//         cors: { origin: "*" }
//     });

//     return setUpIOServer(io);
// }

// export function setUpIOServer(io: SocketServer): SocketServer {
//     io.on("connection", onConnect);
//     return io;
// }

// /* -------------------------------------------------------------------------- */
// /*                              Connection Logic                               */
// /* -------------------------------------------------------------------------- */

// function onConnect(socket: ServerPlayerSocket) {
//     console.log("Client connected");
//     console.log("socket id:", socket.id);
//     console.log("connectedPlayersArr", gameState.players);

//     socket.onAny((eventName, args) => {
//         console.log(`event -> ${eventName}`)
//         console.log("connectedPlayersArr", gameState.players);

//     });

//     registerSocketEvents(socket);

//     socket.on("disconnect", (reason: string) => {
//         if (socket.data?.profile) {
//             console.log(`${socket.id} -> disconnect`)
//             const { seat: playerId } = socket.data.profile;
//             if (playerId === undefined) throw new Error("unexpected error");

//             const profile = gameState.players[playerId];
//             if (profile === null) throw new Error("unexpected error");

//             gameState = gameStateReducer(gameState, {
//                 type: "playerLeave",
//                 payload: {
//                     players: gameState.players,
//                     profile: profile
//                 }
//             });
//             broadcastGameState(socket);
//         }
//     });
// }



// /* -------------------------------------------------------------------------- */
// /*                              Event Registry                                */
// /* -------------------------------------------------------------------------- */

// function registerSocketEvents(socket: ServerPlayerSocket) {
//     const events = socketEvents(socket);
//     const createListener = <H extends EventHandler<any, any>>(handler: H) =>
//         (...args: Parameters<H>) => {
//             const out = handler(...args);
//             if (!out) return;
//             if (!out.length) return;

//             const emissions = Array.isArray(out[0])
//                 ? out as EmitPayload[]
//                 : [out as EmitPayload];

//             emissions.forEach(([eventName, payload]) => {
//                 socket.emit(eventName, ...payload);
//             });
//         };

//     socket.on("getPlayerCount", createListener(events.getPlayerCount));
//     socket.on("registerPlayer", createListener(events.registerPlayer));
//     socket.on("text", createListener(events.text));
// }

// /* -------------------------------------------------------------------------- */
// /*                               Event Handlers                               */
// /* -------------------------------------------------------------------------- */
// type SharedGameState = Omit<GameState, "thisPlayer">;

// function broadcastGameState(socket: ServerPlayerSocket) {
//     const { thisPlayer: _ignore, ...sharedState } = gameState;
//     socket.broadcast.emit("gameUpdate", sharedState as SharedGameState);
// }

// type EmitPayload<E extends keyof ServerToClientEvents = keyof ServerToClientEvents> =
//     [E, [...Parameters<ServerToClientEvents[E]>]];

// type EventHandler<
//     IN extends keyof ClientToServerEvents,
//     OUT extends keyof ServerToClientEvents | void = keyof ServerToClientEvents
// > = (...args: Parameters<ClientToServerEvents[IN]>) =>
//         OUT extends keyof ServerToClientEvents
//         ? | EmitPayload<OUT>
//         | Array<EmitPayload<OUT>>
//         | undefined
//         : undefined;

// const getPlayerCount: EventHandler<"getPlayerCount", "playerCount"> = () => {
//     console.log(`socket: getPlayerCount: ${gameState.connectedPlayers}`);
//     return ["playerCount", [gameState.connectedPlayers]];
// }

// const registerPlayer = (socket: ServerPlayerSocket): EventHandler<"registerPlayer", "playerRegistered" | "playerNotRegistered"> => (playerProfile: Player) => {
//     const availableIndex = gameState.players.findIndex(v => v === null);
//     if (availableIndex == -1) {
//         const reason = "room is full";
//         return ["playerNotRegistered", [reason]]
//     } else {
//         const playerProfileWithId: Player = { ...playerProfile, seat: availableIndex };
//         // FIXME: this will cause race conditions. the gameState variable being mutated inside a socketio hanlder, is dangeorus.
//         gameState = gameStateReducer(gameState, {
//             type: "playerJoin",
//             payload: {
//                 players: gameState.players,
//                 profile: playerProfileWithId,
//             }
//         }) as Required<GameState>;
//         // track player on socket for disconnect cleanup
//         socket.data.profile = playerProfileWithId;
//         console.log(`assigning seat ${availableIndex}`);
//         const stateForPlayer: Required<GameState> = {
//             ...gameState,
//             thisPlayer: playerProfileWithId,
//         };
//         broadcastGameState(socket);
//         return ["playerRegistered", [stateForPlayer]]
//     }
// }

// const text: EventHandler<"text", undefined> = (text: string) => {
//     console.log(`server: got text from client: ${text}`);
// }


// type SocketEvents = {
//     getPlayerCount: EventHandler<"getPlayerCount", "playerCount">;
//     registerPlayer: EventHandler<"registerPlayer", "playerRegistered" | "playerNotRegistered">;
//     text: EventHandler<"text">;
// };

// const socketEvents = (socket: ServerPlayerSocket): SocketEvents => ({
//     getPlayerCount,
//     registerPlayer: registerPlayer(socket),
//     text,
//     // getRoomState,
// });
