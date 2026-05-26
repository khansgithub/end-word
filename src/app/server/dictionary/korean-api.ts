// import { Message, Player } from "@/app/types";
import { getMockedData } from "@/mocks/mock-dictionary-data";
import {
    DictionaryLookupFailedError,
    DictionaryRandomWordFailedError,
    DictionaryUrlNotSetError,
    InvalidDictionaryResponseError,
} from "@/shared/errors";
import { AppEnv, envGet } from "@/app/server/env";
import { isDictionaryEntry, isDictionaryResponse } from "@/shared/guards";
import { DictionaryResponse } from "@/shared/types";
import { log } from "@/app/server/logging";

/** Base URL ending at `/api/dictionary` on Vercel, or `http://localhost:8000` locally. */
function getDictionaryBaseUrl(): string {
    const configured = envGet("DICTIONARY_URL")?.replace(/\/$/, "");
    if (configured) {
        if (configured.endsWith("/api/dictionary")) return configured;
        if (configured.endsWith("/api")) return `${configured}/dictionary`;
        return configured;
    }
    const vercelHost = envGet("VERCEL_URL");
    if (vercelHost) {
        return `https://${vercelHost}/api/dictionary`;
    }
    throw new DictionaryUrlNotSetError();
}

export async function lookUpWordApi(word: string): Promise<DictionaryResponse> {
    const dictionaryUrl = getDictionaryBaseUrl();
    const url = `${dictionaryUrl}/lookup/${encodeURIComponent(word)}`;
    const res = await fetch(url);
    if (res.ok) {
        const data = await res.json();
        if (!isDictionaryResponse(data)) {
            throw new InvalidDictionaryResponseError();
        }
        return data;
    }
    throw new DictionaryLookupFailedError(word, {
        status: res.status,
        url,
    });
}

export async function lookUpWordMock(word: string): Promise<DictionaryResponse> {
    const isFail = envGet("MOCK_WORD_VALIDATION_FAIL") === "true";
    const loadMockData = envGet("MOCK_DICTIONARY_DATA") === "true";
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

export async function getRandomWordFromDictionaryMock(): Promise<string> {
    return "음";
}

export async function getRandomWordFromDictionaryApi(): Promise<string> {
    const dictionaryUrl = getDictionaryBaseUrl();
    const url = `${dictionaryUrl}/random`;
    const res = await fetch(url);
    if (res.ok) {
        const data = await res.json();
        if (!isDictionaryEntry(data)) {
            throw new InvalidDictionaryResponseError();
        }
        return data.key;
    }
    throw new DictionaryRandomWordFailedError();
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
function setExports<T extends (...args: any[]) => unknown>(func: T, mockEnvVar: keyof AppEnv): T {
    const isMock = envGet(mockEnvVar) === "true";
    return exportMap[func.name as keyof typeof exportMap][isMock ? "mock" : "api"] as T;
}

const getRandomWordFromDictionary = setExports(getRandomWordFromDictionaryApi, "MOCK_GET_RANDOM_WORD");
const lookUpWord = setExports(lookUpWordApi, "MOCK_LOOKUP_WORD");

export { getRandomWordFromDictionary, lookUpWord };

