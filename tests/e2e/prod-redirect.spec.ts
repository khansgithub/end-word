/**
 * Production redirect test — Playwright spec file.
 *
 * Works with:  npx playwright test --config=playwright.prod.config.ts
 * Works with:  npx playwright test --config=playwright.prod.config.ts --ui
 *
 * The app MUST be built first (`.next/` must exist).
 *
 * The test skips itself unless PROD_REDIRECT_TEST=true so it never
 * interferes with the regular dev-mode test suite.
 */

import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const ROOT = path.resolve(__dirname, "../..");
const BASE_URL = "http://localhost:3000";
const SITE_PASSWORD = "123";

// ---------------------------------------------------------------------------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let server: ChildProcess | null = null;
let serverReady = false;

async function waitForServer(url: string, timeoutMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status < 500) return;
    } catch { /* not ready yet */ }
    await sleep(2000);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

// ---------------------------------------------------------------------------

test.describe("production redirect", () => {

  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    if (process.env.PROD_REDIRECT_TEST !== "true") {
      return; // skip setup when not explicitly enabled
    }

    const nextDir = path.join(ROOT, ".next");
    if (!fs.existsSync(nextDir)) {
      console.log("[beforeAll] No .next/ found, building …");
      await new Promise<void>((resolve, reject) => {
        const child = spawn("npm", ["run", "build"], {
          cwd: ROOT,
          stdio: "inherit",
          shell: true,
          env: { ...process.env, SITE_PASSWORD, NODE_ENV: "production" },
        });
        child.on("error", reject);
        child.on("exit", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Build failed (exit ${code})`));
        });
      });
      console.log("[beforeAll] Build complete.");
    }

    console.log("[beforeAll] Starting production server …");
    server = spawn("npm", ["run", "prod"], {
      cwd: ROOT,
      stdio: "pipe",
      shell: true,
      env: {
        ...process.env,
        SITE_PASSWORD,
        NODE_ENV: "production",
        MOCK_GET_RANDOM_WORD: "true",
        MOCK_LOOKUP_WORD: "true",
        MOCK_WORD_VALIDATION_FAIL: "false",
      },
    });

    server.stdout!.on("data", (d: Buffer) => process.stdout.write(`[srv] ${d}`));
    server.stderr!.on("data", (d: Buffer) => process.stderr.write(`[srv] ${d}`));

    server.on("exit", (code) => {
      console.log(`[srv] exited with code ${code}`);
    });

    await waitForServer(BASE_URL);
    serverReady = true;
    console.log("[beforeAll] Server ready.");
  });

  test.afterAll(async () => {
    if (server) {
      console.log("[afterAll] Stopping server …");
      server.kill("SIGTERM");
      await sleep(2000);
    }
  });

  // -----------------------------------------------------------------------

  test("full redirect flow: name → password → lobby", async ({ page }) => {
    test.skip(process.env.PROD_REDIRECT_TEST !== "true",
      "Set PROD_REDIRECT_TEST=true to run this test");

    console.log("[test] step 1: navigating to /");
    await page.goto("/");
    console.log("[test] step 1a: waiting for name input");
    await expect(page.locator('input[id="name-b"]')).toBeVisible({ timeout: 10_000 });
    console.log("[test] step 1 done: name input visible");

    console.log("[test] step 2: filling name and submitting");
    await page.fill('input[id="name-b"]', "TestPlayer");
    await page.click('button[type="submit"]');
    console.log("[test] step 2 done: submitted name form");

    console.log("[test] step 3: waiting for redirect to /site-login");
    await page.waitForURL("**/site-login**", { timeout: 20_000 });
    const url1 = page.url();
    console.log(`[test] step 3 done: current URL is ${url1}`);
    expect(url1).toContain("/site-login");

    console.log("[test] step 4: filling password and submitting");
    await page.fill('input[id="site-password"]', SITE_PASSWORD);
    await page.click('button:has-text("Enter")');
    console.log("[test] step 4 done: submitted password");

    console.log("[test] step 5: waiting for redirect to /lobby");
    await page.waitForURL("**/lobby", { timeout: 5_000 });
    const url2 = page.url();
    console.log(`[test] step 5 done: final URL is ${url2}`);
    expect(url2).toContain("/lobby");
  });

});
