import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "tests/e2e",
    timeout: 120_000,
    retries: 0,
    use: {
        baseURL: "http://localhost:4000",
        headless: true,
    },
    webServer: {
        command: "npm run dev:e2e",
        url: "http://localhost:4000",
        timeout: 120_000,
        reuseExistingServer: true,
    },
});
