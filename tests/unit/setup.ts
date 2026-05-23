import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";

process.env.DICTIONARY_URL ??= "http://localhost:8000";
process.env.MOCK_LOOKUP_WORD ??= "true";
process.env.MOCK_GET_RANDOM_WORD ??= "true";
import { resetMswHandlers, startMswTestServer, stopMswTestServer } from "../../src/mocks/test-server";
import { envGet } from "../../src/server/env";
import { setResetLocalStorageAfterEach, shouldResetLocalStorageAfterEach } from "./storage-control";

beforeAll(() => startMswTestServer());
afterEach(() => {
    resetMswHandlers();
    if (shouldResetLocalStorageAfterEach()) {
        localStorage.clear();
    }
});
afterAll(() => stopMswTestServer());

// Allow tests to opt out by setting VITEST_RESET_STORAGE=false.
if (envGet("VITEST_RESET_STORAGE") === "false") {
    setResetLocalStorageAfterEach(false);
}
