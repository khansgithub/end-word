import { defineConfig } from "@playwright/test";
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
        reuseExistingServer: true,
    },
    quiet: true,
    outputDir: "test-results/playwright/runner/",
    reporter:[
        ["json", {outputFile: "test-results/playwright/runner/out.json"}]
    ]
});