import { defineConfig } from "@playwright/test";

const isCustomRunner = process.env.CUSTOM_PLAYWRIGHT_RUNNER === "true";

export default defineConfig({
    testDir: "tests/e2e",
    timeout: 120_000,
    retries: 0,
    use: {
        baseURL: "http://localhost:3000",
        headless: true,
    },
    webServer: {
        command: "npm run dev",
        url: "http://localhost:3000",
        timeout: 120_000,
        // Custom runner relies on per-test env vars reaching server code, so always
        // start a fresh server instead of reusing an already running one.
        reuseExistingServer: !isCustomRunner,
    },
    quiet: true,
    outputDir: "test-results/playwright/runner/",
    reporter:[
        ["json", {outputFile: "test-results/playwright/runner/out.json"}]
    ]
});