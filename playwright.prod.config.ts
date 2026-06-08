import { defineConfig } from "@playwright/test";

/**
 * Playwright config for the production redirect test.
 *
 * The spec file (tests/e2e/prod-redirect.spec.ts) manages its own
 * server lifecycle — no webServer is defined here.
 *
 * Usage:
 *   1.  npm run build
 *   2.  PROD_REDIRECT_TEST=true npx playwright test --config=playwright.prod.config.ts
 *   3.  PROD_REDIRECT_TEST=true npx playwright test --config=playwright.prod.config.ts --ui
 */
export default defineConfig({
    testMatch: "**/prod-redirect.spec.ts",
    timeout: 300_000,
    retries: 0,
    use: {
        baseURL: "http://localhost:3000",
        headless: true,
    },
    // The spec file starts/stops its own server in beforeAll/afterAll.
    // No webServer declaration needed here.
    quiet: false,
    outputDir: "test-results/playwright/prod/",
    reporter: [
        ["list"],
    ],
});
