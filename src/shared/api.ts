// import { Message, Player } from "@/app/types";
import { isDictionaryEntry } from "./guards";
import { DictionaryEntry, DictionaryResponse } from "./types";

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

async function lookUpWordApi(word: string): Promise<DictionaryResponse> {
    const dictionaryUrl = process.env.DICTIONARY_URL;
    if (!dictionaryUrl) {
        throw new Error("Dictionary URL is not set");
    }
    const res = await fetch(`${dictionaryUrl}/lookup/${word}`);
    if (res.ok) {
        const data = await res.json();
        if (!isDictionaryEntry(data)) {
            throw new Error("Invalid dictionary response");
        }
        return data;
    } else {
        throw new Error("Failed to get random word from dictionary");
    }
}

async function lookUpWordMock(word: string): Promise<DictionaryResponse> {
    const isFail = process.env.MOCK_WORD_VALIDATION_FAIL === "true";
    const r: DictionaryResponse = {
        key: "foo",
        data: [{
            word: "foo",
            definition: "bar"
        }]
    };
    return isFail ? {} : r;
}


async function getRandomWordFromDictionaryMock(): Promise<string> {
    return "음";
}

async function getRandomWordFromDictionaryApi(): Promise<string> {
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

const exportMap  = {
    [getRandomWordFromDictionaryApi.name]: {
        api: getRandomWordFromDictionaryApi,
        mock: getRandomWordFromDictionaryMock
    },
    [lookUpWordApi.name]:{
        api: lookUpWordApi,
        mock: lookUpWordMock
    }
};

function setExports<T extends (...args: any[])=>unknown>(func: T): T {
    const isMock = process.env.MOCK_WORD_VALIDATION === "true";
    return exportMap[func.name][isMock ? "mock" : "api"] as T;
}

const getRandomWordFromDictionary = setExports(getRandomWordFromDictionaryApi);
const lookUpWord = setExports(lookUpWordApi)

export { getRandomWordFromDictionary, lookUpWord };
