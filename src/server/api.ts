// import { Message, Player } from "@/app/types";
import { getMockedData } from "../mocks/mock-dictionary-data";
import { isDictionaryEntry } from "../shared/guards";
import { DictionaryResponse } from "../shared/types";
import { log } from "./logging";

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
    const loadMockData = process.env.MOCK_DICTIONARY_DATA === "true";
    log("[lookUpWordMock] isFail:", isFail, "loadMockData:", loadMockData)();
    if (isFail) return {};

    if (loadMockData) {
        const data = getMockedData().next().value as DictionaryResponse;
        log("[lookUpWordMock][getMockedData] data:", JSON.stringify(data))();
        return data;
    } else {
        return {
            key: "foo",
            data: [{
                word: "foo",
                definition: "bar"
            }]
        };
    }
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

const exportMap = {
    [getRandomWordFromDictionaryApi.name]: {
        api: getRandomWordFromDictionaryApi,
        mock: getRandomWordFromDictionaryMock
    },
    [lookUpWordApi.name]: {
        api: lookUpWordApi,
        mock: lookUpWordMock
    }
};

/**
 * Returns either the mock or real API function from `exportsMap`.
 * Add custom logic for when to mock functions.
 */
function setExports<T extends (...args: any[]) => unknown>(func: T, mockEnvVar: string): T {
    const isMock = process.env[mockEnvVar] === "true";
    return exportMap[func.name][isMock ? "mock" : "api"] as T;
}

const getRandomWordFromDictionary = setExports(getRandomWordFromDictionaryApi, "MOCK_GET_RANDOM_WORD");
const lookUpWord = setExports(lookUpWordApi, "MOCK_LOOKUP_WORD");

export { getRandomWordFromDictionary, lookUpWord };

