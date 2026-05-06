/// <reference types="next" />
/// <reference types="next/types/global" />

export declare namespace NodeJS {
    interface ProcessEnv {
        /**
         * Logged at startup in server.ts; no runtime logic uses it.
         */
        SERVER: string
        /**
         * Base URL for dictionary API.
         * api.ts: lookUpWordApi fetches /lookup/:word, getRandomWordFromDictionaryApi fetches /random.
         */
        DICTIONARY_URL: string
        /**
         * When "true", getRandomWordFromDictionary uses mock instead of real API.
         */
        MOCK_GET_RANDOM_WORD: string
        /**
         * When "true", lookUpWord uses mock instead of real API.
         */
        MOCK_LOOKUP_WORD: string
        /**
         * When "true", lookUpWordMock returns {} (failed validation); otherwise returns valid mock data.
         * Used by playerHealthDecreases e2e test.
         */
        MOCK_WORD_VALIDATION_FAIL: string
        /**
         * When "true", lookUpWordMock uses getMockedData().next() instead of hardcoded data.
         * Required for playerDiesIn3PlayerGame e2e test.
         */
        MOCK_DICTIONARY_DATA: string
        /**
         * When "true", server.ts enables test endpoints (e.g. logs route).
         * Used by dev:e2e.
         */
        PLAYWRIGHT_TEST: string
        /**
         * isSuppress() in utils.ts returns true when set.
         * Intended to suppress verbose output; usages in pp() and socketClient are commented out.
         */
        SUPPRESS: string
        NEXT_PUBLIC_SUPABASE_URL: string
        NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    }
}