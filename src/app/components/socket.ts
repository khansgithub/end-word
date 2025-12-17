import { ActionDispatch, RefObject } from "react";
import { io } from "socket.io-client";
import { GameState, gameStateReducer } from "../../shared/GameState";
import { Player, ClientPlayerSocket as PlayerSocket, ServerToClientEvents } from "../../shared/types";

export type websocketHanlderRefs = {
    socket: RefObject<PlayerSocket>,
    gameState: GameState,
    gameStateUpdate: ActionDispatch<[action: Parameters<typeof gameStateReducer>[1]]>
};

export function getSocketManager(): PlayerSocket {
    return io() as PlayerSocket;
}

export function websocketHanlder({ socket, gameState, gameStateUpdate }: websocketHanlderRefs) {
    const socket_ = socket.current;
    function onConnect() { }
    function onEvent() { }

    function onPlayerJoin(profile: Player ) {
        if (profile.playerId && (profile.playerId < 0 || profile.playerId > gameState.players.length)) {
            // defensive
            throw new Error("unexpected error") // implment more specific errors
        }
        gameStateUpdate({
            type: "playerJoin",
            payload: {
                players: gameState.players as Player[],
                profile: profile
            }
        });
        // const [lastWord, setLastWord] = useState("");
        // refs.players[profile.playerId] = new Player(profile.name, lastWord, setLastWord);

    }

    function onPlayerCount(count: number) {}

    const events: ServerToClientEvents = {
        playerJoin: onPlayerJoin,
        playerCount: onPlayerCount,
        gameUpdate: ()=>{}
    };

    Object.keys(events).forEach((event) => {
        const e = event as keyof ServerToClientEvents;
        socket_.on(e, events[e]);
    });

    socket_.on("connect", () => {
        console.log("WebSocket connected");
        onConnect();
    });

    socket_.on("disconnect", () => {
        Object.keys(events).forEach((event) => {
            const e = event as keyof ServerToClientEvents;
            socket_.off(e);
        });
    })


    // refs.socket.on("chatMessage", message => {
    //     setMessages((prev) => [...prev, message]);
    //     input_fields[player_i][0].current = "";
    //     input_fields[player_i][1].current?.refresh();
    //     _nextTurn();
    // });

    // refs.socket.on("swapRole", () => {
    //     switchRoles();
    // });

    // refs.socket.on("endChat", () => {
    //     console.log("got endChat from server");
    //     endChat();
    // })

    // refs.socket.on("swapCharacter", foo => {
    //     _swapCharacter();
    // });

    // refs.socket.on("roomFull", () => {
    //     console.log("got room full from server");
    //     setRoomFull(true);
    // })

    // refs.socket.on("text", text => {
    //     console.log("Socket message from server: ", text);
    // });
}