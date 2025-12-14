// import { Message, Player } from "@/app/types";

type Response = {
    key: string;
    data: Array<string>;
} | {};

export interface Shared {
    swapCharacter: () => void;
    swapRole: () => void;
    endChat: () => void;
}

export interface ClientToServerEvents extends Shared {
    chatMessage: (
        msg: Message,
    ) => void;
}

export interface ServerToClientEvents extends Shared {
    chatMessage: (msg: Message) => void;
    setTurn: (turn: 0 | 1) => void;
    roomFull: (roomSize?: number, cb?: () => void) => void;
    text: (text: string) => void;
}

export interface SocketProperties {
    player_number: 0 | 1;
}

export async function lookUpWord(word: String): Promise<Response> {
    const res = await fetch("http://localhost:8000/lookup/" + word);
    if (res.ok) {
        const data = await res.json();
        console.log("/server/api");
        console.log(data);
        return data;
    } else {
        return {};
    }
}
