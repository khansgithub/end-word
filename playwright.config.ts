import { defineConfig } from "@playwright/test";

/** Legacy Socket.IO E2E (`room-flow.spec.ts`) expects `npm run dev:legacy` on port 4000. */
const runRoomFlow = process.env["RUN_ROOM_FLOW"] === "1" || process.env["RUN_ROOM_FLOW"] === "true";

export default defineConfig({
    testDir: "tests/e2e",
    testIgnore: runRoomFlow ? [] : ["**/room-flow.spec.ts"],
    timeout: 120_000,
    retries: 0,
    use: {
        baseURL: "http://localhost:3000",
        headless: true,
    },
    webServer: {
        command: "npm run dev",
        url: "http://localhost:3000/api/health",
        timeout: 120_000,
        reuseExistingServer: true,
    },
    quiet: true,
    outputDir: "test-results/playwright/runner/",
    reporter:[
        ["json", {outputFile: "test-results/playwright/runner/out.json"}]
    ]
});