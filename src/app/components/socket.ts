import { io } from "socket.io-client";
import { ActionDispatch, Dispatch, RefObject, useState } from "react";
import { GameState, gameStateReducer } from "./GameState";
import { PlayerProfile, ClientPlayerSocket as PlayerSocket, ServerToClientEvents} from "../../shared/types";

export type websocketHanlderRefs = {
    socket: RefObject<PlayerSocket>,
    gameState: GameState,
    gameStateUpdate:  ActionDispatch<[action: Parameters<typeof gameStateReducer>[1]]>
    // players: Player[]
};

export function getSocketManager() : PlayerSocket{
    return io() as PlayerSocket;
}

export function websocketHanlder({socket, gameState, gameStateUpdate}: websocketHanlderRefs) {
    const socket_ = socket.current;
    function onConnect() { }
    function onEvent() { }

    function onPlayerJoin(profile: PlayerProfile){
        if (profile.playerId < 0 || profile.playerId > gameState.players.length){
            // defensive
            throw new Error("unexpected error") // implment more specific errors
        }
        gameStateUpdate({
            type: "playerJoin",
            payload: {
                players: gameState.players,
                profile: profile 
            }
        });
        // const [lastWord, setLastWord] = useState("");
        // refs.players[profile.playerId] = new Player(profile.name, lastWord, setLastWord);

    }

    function onPlayerCount(count: number){
        
    }

    const events: ServerToClientEvents = {
        playerJoin: onPlayerJoin,
        playerCount: onPlayerCount
    };

    Object.keys(events).forEach( (event: keyof ServerToClientEvents) => {
        socket_.on(event, events[event]);
    });

    socket_.on("connect", () => {
        console.log("WebSocket connected");
        onConnect();
    });

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