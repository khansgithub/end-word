import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { resetMswHandlers, startMswTestServer, stopMswTestServer } from "../../src/mocks/test-server";
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
if (process.env.VITEST_RESET_STORAGE === "false") {
    setResetLocalStorageAfterEach(false);
}
