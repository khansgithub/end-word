import http from "http";
import { Server as SocketServer } from "socket.io";
import { GameState, Player, ServerPlayerSocket } from "../shared/types";
import { buildInitialGameState, gameStateReducer } from "../shared/GameState";


export function createIOServer(server: http.Server): SocketServer {
    const io = new SocketServer(server, {
        cors: { origin: "*" }
    });

    return setUpIOServer(io);
}

function createMutex() {
    let last: Promise<void> = Promise.resolve();

    return <T>(fn: () => Promise<T> | T): Promise<T> => {
        const run = last.then(fn);
        last = run.then(() => undefined, () => undefined);
        return run;
    };
}

function createOnConnect(state: GameState, runExclusive: <T>(fn: () => Promise<T> | T) => Promise<T>) {
    return (socket: ServerPlayerSocket) => {
        console.log("Client connected");
        console.log("socket id:", socket.id);

        // socket.on("gameUpdate", (update: Partial<GameState>) => {
        console.log("gameUpdate");
        //     void runExclusive(async () => {
        //         state = {
        //             ...state,
        //             ...update
        //         };
        //     });
        // });

        socket.on("text", (text: string) => {
            console.log("text", text);
            console.log(`Text from client: ${text}`);
        });

        socket.on("getPlayerCount", () => {
            console.log("getPlayerCount", state.connectedPlayers);
            socket.emit("playerCount", state.connectedPlayers);
        });

        socket.on("registerPlayer", (playerProfile: Player) => {
            console.log("registerPlayer", playerProfile);
            const availableIndex = state.players.findIndex(v => v === null);
            if (availableIndex == -1) {
                const reason = "room is full";
                socket.emit("playerNotRegistered", reason);
                return
            }

            const playerProfileWithId: Player = { ...playerProfile, playerId: availableIndex };
            const reducerParams = [
                state,
                playerProfileWithId,
                true
            ] as const;
            console.log("to reducer: ", reducerParams);
            const nextState = gameStateReducer(state, {
                type: "addPlayer",
                payload: [...reducerParams]
            });

            if (nextState.thisPlayer === undefined) {
                console.error(nextState)
                throw new Error("nextState.thisPlayer should be the registered players but its undefined");
            }

            void runExclusive(async () => state = nextState);

            console.log(`assigning seat ${availableIndex}`);

            // "as Req..." this is somethign to look at later.
            socket.emit("playerRegistered", nextState as Required<GameState>);
            socket.broadcast.emit("playerJoinNotification", playerProfile);

        });

        socket.onAny((eventName) => {
            console.log(`event -> ${eventName}`);
        });
    };
}

export function setUpIOServer(io: SocketServer): SocketServer {
    const state: GameState = buildInitialGameState();
    const runExclusive = createMutex();

    io.on("connection", createOnConnect(state, runExclusive));
    return io;
}
