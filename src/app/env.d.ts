/// <reference types="next" />
/// <reference types="next/types/global" />

export declare namespace NodeJS {
    interface ProcessEnv {
        SERVER: string
        DICTIONARY_URL: string
        MOCK_WORD_VALIDATION: string
        MOCK_WORD_VALIDATION_FAIL: string
        PLAYWRIGHT_TEST: string
        SUPPRESS: string
    }
}