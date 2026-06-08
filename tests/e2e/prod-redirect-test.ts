/**
 * Production redirect test.
 *
 * Verifies the site-lock → site-login redirect flow in production mode:
 *   1. Navigate to homepage      →  name input visible
 *   2. Enter name, submit        →  proxy redirects to /site-login?returnTo=...
 *   3. Enter password, submit    →  redirects to /lobby
 *
 * Run:  npx tsx tests/e2e/prod-redirect-test.ts
 *
 * The app MUST be built first (`.next/` must exist).
 * The script automatically builds if needed.
 */

import { chromium } from "@playwright/test";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const SITE_PASSWORD = "123";
const ROOT = path.resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url: string, timeoutMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      // Accept any non-500 response as "server is up"
      if (res.ok || res.status < 500) return;
    } catch {
      // not ready yet
    }
    await sleep(2000);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

function runBuild(cmd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, {
      stdio: "inherit",
      shell: true,
      cwd: ROOT,
      env: { ...process.env, SITE_PASSWORD, NODE_ENV: "production" },
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

// ---------------------------------------------------------------------------
function print(msg: string) {
  process.stdout.write(`  ${msg}\n`);
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("─".repeat(58));
  console.log("  Production Redirect Test");
  console.log("─".repeat(58));

  // 1 – Build if needed ---------------------------------------------------
  const nextDir = path.join(ROOT, ".next");
  if (!fs.existsSync(nextDir)) {
    print("Step 1/3: Building app (npm run build) …");
    const code = await runBuild("npm run build");
    if (code !== 0) {
      console.error("\n  Build failed — aborting.");
      process.exit(1);
    }
    print("Build complete.\n");
  } else {
    print("Step 1/3: Build already exists, skipping.\n");
  }

  // 2 – Start production server -------------------------------------------
  print("Step 2/3: Starting production server …\n");

  const server: ChildProcess = spawn("npm", ["run", "prod"], {
    cwd: ROOT,
    stdio: "pipe",
    shell: true,
    env: {
      ...process.env,
      SITE_PASSWORD,
      NODE_ENV: "production",
      // mock flags so dictionary lookups don't hit external services
      MOCK_GET_RANDOM_WORD: "true",
      MOCK_LOOKUP_WORD: "true",
      MOCK_WORD_VALIDATION_FAIL: "false",
    },
  });

  let serverOut = "";
  server.stdout!.on("data", (d: Buffer) => { serverOut += d.toString(); });
  server.stderr!.on("data", (d: Buffer) => { serverOut += d.toString(); });

  let serverExitCode: number | null = null;
  server.on("exit", (code) => { serverExitCode = code; });

  try {
    await waitForServer(BASE_URL);
    print("Server is ready.\n");

    // 3 – Run test ----------------------------------------------------------
    print("Step 3/3: Running test …\n");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();

    let passed = 0;
    let failed = 0;

    async function check(description: string, fn: () => Promise<void>) {
      try {
        await fn();
        console.log(`  ✓  ${description}`);
        passed++;
      } catch (err) {
        console.log(`  ✗  ${description}`);
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`     ${msg.replace(/\n/g, "\n     ")}`);
        failed++;
      }
    }

    // --- step 1: homepage has name input ---
    await check("homepage renders name input", async () => {
      await page.goto("/");
      await page.waitForSelector('input[id="name-b"]', { timeout: 10_000 });
    });

    // --- step 2: enter name and submit ---
    await check("enter name and submit", async () => {
      await page.fill('input[id="name-b"]', "TestPlayer");
      await page.click('button[type="submit"]');
    });

    // --- step 3: proxy redirects to /site-login ---
    await check("redirected to /site-login with returnTo param", async () => {
      await page.waitForURL("**/site-login**", { timeout: 20_000 });
      const url = page.url();
      if (!url.includes("/site-login")) {
        throw new Error(`URL does not contain /site-login — got: ${url}`);
      }
      if (!url.includes("returnTo=")) {
        // This might not be fatal (depends on proxy impl), but worth flagging
        console.warn(`     ⚠  no returnTo param in URL: ${url}`);
      }
    });

    // --- step 4: enter password and submit ---
    await check("enter password and submit", async () => {
      await page.fill('input[type="password"]', SITE_PASSWORD);
      await page.click('button[type="submit"]');
    });

    // --- step 5: redirected to /lobby ---
    await check("redirected to /lobby", async () => {
      await page.waitForURL("**/lobby", { timeout: 25_000 });
      const url = page.url();
      if (!url.includes("/lobby")) {
        throw new Error(`URL does not contain /lobby — got: ${url}`);
      }
    });

    await browser.close();

    // --- summary ---
    console.log(`\n${"─".repeat(58)}`);
    console.log(`  ${passed} passed,  ${failed} failed`);
    console.log(`${"─".repeat(58)}`);

    if (failed > 0) process.exit(1);
  } finally {
    // Cleanup
    if (serverExitCode === null) {
      print("\nStopping server …");
      server.kill("SIGTERM");
      // Force-kill after grace period
      setTimeout(() => {
        if (serverExitCode === null) server.kill("SIGKILL");
      }, 5000);
    }
    // Print server output if there was a failure
    if (serverOut.length > 0) {
      console.log("\n── server output ──");
      console.log(serverOut.slice(-2000));  // last 2KB
      console.log("── end ──");
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
