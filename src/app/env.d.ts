/// <reference types="next" />
/// <reference types="next/types/global" />

declare namespace NodeJS {
    interface ProcessEnv {
        SERVER: string
        DICTIONARY_URL: string
        MOCK_WORD_VALIDATION: string
        MOCK_WORD_VALIDATION_FAIL: string
    }
}