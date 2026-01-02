import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { roomFlowTestNames } from "./test-names";

async function scrapeMetric(request: APIRequestContext, name: string, label?: string) {
    const res = await request.get("/metrics");
    const text = await res.text();
    const lines = text.split("\n").map((l) => l.trim());
    const matcher = label
        ? new RegExp(`^${name}\\{[^}]*${label.replace(/[-/\\\\.^$*+?()[\\]{}|]/g, "\\$&")}[^}]*\\} (\\d+(?:\\.\\d+)?)$`)
        : new RegExp(`^${name} (\\d+(?:\\.\\d+)?)$`);
    for (const line of lines) {
        const m = matcher.exec(line);
        if (m) return Number(m[1]);
    }
    return 0;
}

type LogEntry = { ts: number; msg: string; source: "client" | "browser" | "server" };

async function collectAndPrintMergedLogs(
    clientLogs: LogEntry[],
    request: APIRequestContext
): Promise<void> {
    const logsRes = await request.get("/__test/server-logs");
    let serverLogs: LogEntry[] = [];
    if (logsRes.ok()) {
        const logs = await logsRes.json();
        if (Array.isArray(logs.logs)) {
            serverLogs = logs.logs.map((l: any) => ({
                ts: typeof l.ts === "number" ? l.ts : Date.now(),
                msg: typeof l.msg === "string" ? l.msg : JSON.stringify(l),
                source: "server" as const,
            }));
        }
    }

    const merged = [
        ...clientLogs.map((l) => ({ ...l, source: l.source ?? "client" as const })),
        ...serverLogs,
    ].sort((a, b) => a.ts - b.ts);

    console.log("----- merged logs (chronological) -----");
    for (const entry of merged) {
        console.log(new Date(entry.ts).toISOString(), `[${entry.source}]`, entry.msg);
    }
    console.log("----- end merged logs -----");
}

test(roomFlowTestNames.resetAfterReload, async ({ page, request }) => {
    const clientLogs: LogEntry[] = [];

    const log = (message: string) => {
        const ts = Date.now();
        const entry: LogEntry = { ts, msg: `[client] ${message}`, source: "client" };
        clientLogs.push(entry);
        console.log(new Date(ts).toISOString(), entry.msg);
    };

    page.on("console", (msg) => {
        const ts = Date.now();
        const line = `[browser-console] ${msg.type()}: ${msg.text()}`;
        clientLogs.push({ ts, msg: line, source: "browser" });
        console.log(new Date(ts).toISOString(), line);
    });

    log("goto /");
    await page.goto("/");

    log("wait for socket connect (server stats)");
    await expect
        .poll(() => scrapeMetric(request, "socket_event_total", 'event="connect"'), { timeout: 15_000, intervals: [500, 750, 1000] })
        .toBeGreaterThan(0);

    log("wait for playerCount event (server stats)");
    await expect
        .poll(() => scrapeMetric(request, "socket_event_total", 'event="getPlayerCount"'), { timeout: 15_000, intervals: [500, 750, 1000] })
        .toBeGreaterThan(0);

    let roomHeading = page.getByRole("heading", { level: 1, name: /Room:/i });
    log("wait for Room heading text");
    await expect(roomHeading).toHaveText("Room: 0/5", { timeout: 10_000 });

    const nameInput = page.getByRole("textbox", { name: /name/i });
    log('fill name "Foo"');
    await nameInput.fill("Foo");
    log("press Enter to join room");
    await nameInput.press("Enter");

    log("wait for navigation to /room");
    await page.waitForURL("**/room", { timeout: 15_000 });
    log("wait for Match text");
    await expect(page.getByText(/Match:/)).toBeVisible({ timeout: 10_000 });

    log("hard reload (ignore cache)");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.clearBrowserCache");
    await cdp.send("Network.clearBrowserCookies");
    await cdp.send("Page.reload", { ignoreCache: true });
    log("wait for redirect back to /");
    await page.waitForURL("http://localhost:4000/", { timeout: 15_000 });

    roomHeading = page.getByRole("heading", { level: 1, name: /Room:/i });
    log(`check to see if the previous session has been terminated: [${await roomHeading.textContent()}]`);
    await expect(roomHeading).toHaveText("Room: 0/5", { timeout: 10_000 });

    await expect
        .poll(() => scrapeMetric(request, "socket_registered_clients"), {
            timeout: 8_000,
            intervals: [500, 1000, 1500, 2000],
        })
        .toBe(0);

    // Dump a summary of metrics for visibility.
    const metricsText = await (await request.get("/metrics")).text();
    console.log("----- metrics snapshot -----");
    for (const line of metricsText.split("\n")) {
        if (line.startsWith("socket_")) console.log(line);
    }
    console.log("----- end metrics snapshot -----");

    await collectAndPrintMergedLogs(clientLogs, request);
});

test(roomFlowTestNames.dualBrowserJoin, async ({ browser, request }) => {
    /**
     * Regression guard: verify two isolated browsers can both join; then on one page we assert the UI renders all 5 player slots (#players > div count).
     * Currently observed failure: only fewer than 5 divs render in CI/local, so this test captures and logs that discrepancy.
     */
    const clientLogs: LogEntry[] = [];
    const log = (message: string, source: "client" | "browser" | "server" = "client") => {
        const ts = Date.now();
        const entry: LogEntry = { ts, msg: `[${source}] ${message}`, source };
        clientLogs.push(entry);
        console.log(new Date(ts).toISOString(), entry.msg);
    };

    const contextA = await browser.newContext({ baseURL: "http://localhost:4000" });
    const contextB = await browser.newContext({ baseURL: "http://localhost:4000" });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const attachConsole = (pageLabel: string, page: typeof pageA) => {
        page.on("console", (msg) => {
            const ts = Date.now();
            const line = `[browser:${pageLabel}] ${msg.type()}: ${msg.text()}`;
            clientLogs.push({ ts, msg: line, source: "browser" });
            console.log(new Date(ts).toISOString(), line);
        });
    };

    attachConsole("A", pageA);
    attachConsole("B", pageB);

    log("goto / on both pages");
    await Promise.all([pageA.goto("/"), pageB.goto("/")]);

    const inputA = pageA.getByRole("textbox", { name: /name/i });
    const inputB = pageB.getByRole("textbox", { name: /name/i });

    log('fill name "Alice" on A');
    await inputA.fill("Alice");
    log('fill name "Bob" on B');
    await inputB.fill("Bob");

    log("press Enter on both pages to join room");
    await Promise.all([
        inputA.press("Enter"),
        inputB.press("Enter"),
        pageA.waitForURL("**/room", { timeout: 15_000 }),
        pageB.waitForURL("**/room", { timeout: 15_000 }),
    ]);

    log("wait for loading spinners to disappear");
    const loadingA = pageA.locator("span.loading");
    const loadingB = pageB.locator("span.loading");
    await Promise.all([
        loadingA.first().waitFor({ state: "detached", timeout: 20_000 }),
        loadingB.first().waitFor({ state: "detached", timeout: 20_000 }),
    ]);

    const playersA = pageA.locator("#players");
    log("assert #players visible");
    await expect(playersA).toBeVisible({ timeout: 10_000 });
    log("assert #players has 5 children");
    await expect(playersA.locator("> div")).toHaveCount(5, { timeout: 10_000 });

    await Promise.all([contextA.close(), contextB.close()]);

    await collectAndPrintMergedLogs(clientLogs, request);
});

test(roomFlowTestNames.turnChangeUpdatesHighlight, async ({ browser, request }) => {
    /**
     * Test that when player 1 submits a valid word, the turn changes to player 2,
     * and the inputDomHighlight value is updated to the new matchLetter's first step.
     */
    const clientLogs: LogEntry[] = [];
    const log = (message: string) => {
        const ts = Date.now();
        const entry: LogEntry = { ts, msg: `[client] ${message}`, source: "client" };
        clientLogs.push(entry);
        console.log(new Date(ts).toISOString(), entry.msg);
    };

    const contextA = await browser.newContext({ baseURL: "http://localhost:4000" });
    const contextB = await browser.newContext({ baseURL: "http://localhost:4000" });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const attachConsole = (pageLabel: string, page: typeof pageA) => {
        page.on("console", (msg) => {
            const ts = Date.now();
            const line = `[browser:${pageLabel}] ${msg.type()}: ${msg.text()}`;
            clientLogs.push({ ts, msg: line, source: "browser" });
            console.log(new Date(ts).toISOString(), line);
        });
    };

    attachConsole("A", pageA);
    attachConsole("B", pageB);

    log("goto / on both pages");
    await Promise.all([pageA.goto("/"), pageB.goto("/")]);

    const inputA = pageA.getByRole("textbox", { name: /name/i });
    const inputB = pageB.getByRole("textbox", { name: /name/i });

    log('fill name "Player1" on A');
    await inputA.fill("Player1");
    log('fill name "Player2" on B');
    await inputB.fill("Player2");

    log("press Enter on both pages to join room");
    await Promise.all([
        inputA.press("Enter"),
        inputB.press("Enter"),
        pageA.waitForURL("**/room", { timeout: 15_000 }),
        pageB.waitForURL("**/room", { timeout: 15_000 }),
    ]);

    log("wait for loading spinners to disappear");
    const loadingA = pageA.locator("span.loading");
    const loadingB = pageB.locator("span.loading");
    await Promise.all([
        loadingA.first().waitFor({ state: "detached", timeout: 20_000 }),
        loadingB.first().waitFor({ state: "detached", timeout: 20_000 }),
    ]);

    log("wait for game to start (status should be 'playing')");
    await expect(pageA.getByText("PLAYING")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByText("PLAYING")).toBeVisible({ timeout: 10_000 });

    // Find the highlight input element (the one with aria-hidden="true")
    const highlightInputA = pageA.locator('input[aria-hidden="true"]').first();
    const highlightInputB = pageB.locator('input[aria-hidden="true"]').first();

    log("get initial matchLetter from page A");
    const matchLetterDisplayA = pageA.getByText(/Match Letter/i).locator("..").getByText(/[가-힣]/);
    const matchLetterDisplayB = pageB.getByText(/Match Letter/i).locator("..").getByText(/[가-힣]/);
    await expect(matchLetterDisplayA).toBeVisible({ timeout: 10_000 });
    const initialMatchLetter = await matchLetterDisplayA.textContent();
    log(`initial matchLetter: ${initialMatchLetter}`);

    // Verify initial highlight value (should be the first step of the matchLetter)
    // For "가", the first step is "ㄱ"
    const initialHighlightValue = await highlightInputA.inputValue();
    log(`initial highlight value on page A: ${initialHighlightValue}`);

    // Find the actual input field (not the highlight one)
    const wordInputA = pageA.getByRole('textbox', { disabled: false }).first();
    const wordInputB = pageB.getByRole('textbox', { disabled: false }).first();
    const submitButtonA = pageA.getByRole("button", { name: /submit word/i });
    const submitButtonB = pageB.getByRole("button", { name: /submit word/i });

    
    log("check if it's player 1's turn (wordInputA should exist and not be empty)");
    let isPageAEnabled = false;
    // We check if wordInputA resolves to a DOM element and is not empty (enabled), otherwise, it's B's turn
    const wordInputAHandle = await wordInputA.elementHandle({ timeout: 1_000 });
    log("Checking if wordInputA element exists...");
    if (wordInputAHandle) {
        log("wordInputAHandle found. Evaluating its state...");
        const isDisabled = await wordInputAHandle.evaluate(
            (el) => !(el instanceof HTMLInputElement) || el.disabled
        );
        log(`Checked wordInputAHandle: isDisabled = ${isDisabled}`);
        if (!isDisabled) {
            log("wordInputA is enabled; it's page A's turn.");
            isPageAEnabled = true;
        } else {
            log("wordInputA is present but disabled, switching to page B");
            await expect(wordInputB).toBeEnabled({ timeout: 10_000 });
            isPageAEnabled = false;
        }
    } else {
        log("wordInputA does not exist, switching to page B");
        await expect(wordInputB).toBeEnabled({ timeout: 10_000 });
        isPageAEnabled = false;
    }

    // Determine which page to use
    const activeWordInput = isPageAEnabled ? wordInputA : wordInputB;
    const activeSubmitButton = isPageAEnabled ? submitButtonA : submitButtonB;
    const activePage = isPageAEnabled ? pageA : pageB;
    const inactiveWordInput = isPageAEnabled ? wordInputB : wordInputA;
    const activeMatchLetterDisplay = isPageAEnabled ? matchLetterDisplayA : matchLetterDisplayB;
    const activeHighlightInput = isPageAEnabled ? highlightInputA : highlightInputB;
    const inactiveMatchLetterDisplay = isPageAEnabled ? matchLetterDisplayB : matchLetterDisplayA;

    // Type a valid word starting with the matchLetter
    // For example, if matchLetter is "가", type "가나다"
    const wordToSubmit = initialMatchLetter === "가" ? "가나다" : `${initialMatchLetter}나다`;
    log(`typing word: ${wordToSubmit}`);
    await activeWordInput.fill(wordToSubmit);

    log("submitting word");
    await activeSubmitButton.click();

    // Wait for the turn to change - the input on the active page should become disabled
    log("waiting for turn to change (input on active page should become disabled)");
    await expect(activeWordInput).toBeDisabled({ timeout: 10_000 });

    // Wait for the new matchLetter to appear (should be the last character of the submitted word)
    const expectedNewMatchLetter = wordToSubmit.slice(-1);
    log(`waiting for new matchLetter to be: ${expectedNewMatchLetter}`);
    await expect(activeMatchLetterDisplay).toHaveText(expectedNewMatchLetter, { timeout: 10_000 });

    // Get the new highlight value - should be the first step of the new matchLetter
    // For "다", the first step is "ㄷ"
    const newHighlightValue = await activeHighlightInput.inputValue();
    log(`new highlight value on active page: ${newHighlightValue}`);

    // Verify the highlight value is updated to the new matchLetter's first step
    // We need to determine what the first step should be based on the new matchLetter
    // For "다", it should be "ㄷ"
    const expectedHighlight = expectedNewMatchLetter === "다" ? "ㄷ" : expectedNewMatchLetter[0];
    expect(newHighlightValue).toBe(expectedHighlight);

    // Also verify on the inactive page that it's now their turn and the highlight is correct
    log(`verifying inactive page (${isPageAEnabled ? 'B' : 'A'}) now has their turn`);
    await expect(inactiveWordInput).toBeEnabled({ timeout: 10_000 });

    const inactiveHighlightInput = isPageAEnabled ? highlightInputB : highlightInputA;
    const inactiveHighlightValue = await inactiveHighlightInput.inputValue();
    log(`highlight value on inactive page: ${inactiveHighlightValue}`);
    expect(inactiveHighlightValue).toBe(expectedHighlight);

    await Promise.all([contextA.close(), contextB.close()]);

    await collectAndPrintMergedLogs(clientLogs, request);
});