import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { resetMswHandlers, startMswTestServer, stopMswTestServer } from "@/mocks/test-server";
import { envGet } from "@/app/server/env";
import { setResetLocalStorageAfterEach, shouldResetLocalStorageAfterEach } from "@tests/unit/storage-control";

process.env.DICTIONARY_URL ??= "http://localhost:8000";
process.env.MOCK_LOOKUP_WORD ??= "true";
process.env.MOCK_GET_RANDOM_WORD ??= "true";

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
