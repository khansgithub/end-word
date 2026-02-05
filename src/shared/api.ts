// import { Message, Player } from "@/app/types";
import { isDictionaryEntry } from "./guards";

// type Response = {
//     key: string;
//     data: Array<string>;
// } | {};

// export interface Shared {
//     swapCharacter: () => void;
//     swapRole: () => void;
//     endChat: () => void;
// }

// export interface ClientToServerEvents extends Shared {
//     chatMessage: (
//         msg: Message,
//     ) => void;
// }

// export interface ServerToClientEvents extends Shared {
//     chatMessage: (msg: Message) => void;
//     setTurn: (turn: 0 | 1) => void;
//     roomFull: (roomSize?: number, cb?: () => void) => void;
//     text: (text: string) => void;
// }

// export interface SocketProperties {
//     player_number: 0 | 1;
// }

export async function lookUpWord(word: String): Promise<Response> {
    const dictionaryUrl = process.env.DICTIONARY_URL;
    if (!dictionaryUrl) {
        throw new Error("Dictionary URL is not set");
    }
    const res = await fetch(`${dictionaryUrl}/lookup/${word}`);
    if (res.ok) {
        const data = await res.json();
        console.log("/server/api");
        console.log(data);
        return data;
    } else {
        throw new Error("Failed to look up word");
    }
}


export async function getRandomWordFromDictionary(): Promise<string> {
    const dictionaryUrl = process.env.DICTIONARY_URL;
    if (!dictionaryUrl) {
        throw new Error("Dictionary URL is not set");
    }
    const res = await fetch(`${dictionaryUrl}/random`);
    if (res.ok) {
        const data = await res.json();
        if (!isDictionaryEntry(data)) {
            throw new Error("Invalid dictionary response");
        }
        return data.key;
    } else {
        throw new Error("Failed to get random word from dictionary");
    }
}