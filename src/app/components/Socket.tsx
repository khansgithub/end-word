import { Socket, io } from "socket.io-client";
import { ClientToServerEvents, PlayerProfile, ServerToClientEvents, SocketProperties } from "../../server/types";
import { RefObject } from "react";
import { Player } from "../classes";

type PlayerSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export type websocketHanlderRefs = {
    socket: RefObject<PlayerSocket>,
    players: Player[]
};

export function getSocketManager() : PlayerSocket{
    return io() as PlayerSocket;
}

export function websocketHanlder(refs: websocketHanlderRefs): (PlayerSocket) => void {
    function onConnect() { }
    function onEvent() { }

    function onPlayerJoin(profile: PlayerProfile){
        if (profile.playerId < 0 || profile.playerId > refs.players.length){
            // defensive
            throw new Error("unexpected error") // implment more specific errors
        }
        const [lastWord, setLastWord] = useState("");
        refs.players[profile.playerId] = new Player(profile.name, lastWord, setLastWord);

    }

    const events: ServerToClientEvents = {
        playerJoin: onPlayerJoin
    };

    Object.keys(events).forEach( (event: keyof ServerToClientEvents) => {
        refs.socket.on(event, events[event]);
    });

    refs.socket.on("connect", () => {
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

    return socketEvents
}