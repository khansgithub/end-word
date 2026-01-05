import { expect, test } from "@playwright/test";
import type { APIRequestContext, CDPSession, BrowserContext, Page, Locator } from "@playwright/test";
import { roomFlowTestNames } from "./test-names";
import { decomposeSyllable } from "../../src/app/hangul-decomposer";

async function scrapeMetric(request: APIRequestContext, name: string, label?: string): Promise<number> {
    try {
        const res = await request.get("/metrics");
        if (!res.ok()) {
            console.warn(`[scrapeMetric] Failed to fetch metrics: ${res.status()} ${res.statusText()}`);
            return 0;
        }
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
    } catch (error) {
        console.warn(`[scrapeMetric] Error scraping metric ${name}:`, error);
        return 0;
    }
}

type LogEntry = { ts: number; msg: string; source: "client" | "browser" | "server" };

async function collectAndPrintMergedLogs(
    clientLogs: LogEntry[],
    request: APIRequestContext
): Promise<void> {
    try {
        const logsRes = await request.get("/__test/server-logs");
        let serverLogs: LogEntry[] = [];
        if (logsRes.ok()) {
            try {
                const logs = await logsRes.json();
                if (Array.isArray(logs.logs)) {
                    serverLogs = logs.logs.map((l: any) => ({
                        ts: typeof l.ts === "number" ? l.ts : Date.now(),
                        msg: typeof l.msg === "string" ? l.msg : JSON.stringify(l),
                        source: "server" as const,
                    }));
                }
            } catch (parseError) {
                console.warn("[collectAndPrintMergedLogs] Failed to parse server logs:", parseError);
            }
        } else {
            console.warn(`[collectAndPrintMergedLogs] Failed to fetch server logs: ${logsRes.status()} ${logsRes.statusText()}`);
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
    } catch (error) {
        console.error("[collectAndPrintMergedLogs] Error collecting logs:", error);
        // Still print client logs even if server logs fail
        if (clientLogs.length > 0) {
            console.log("----- client logs only (server logs unavailable) -----");
            for (const entry of clientLogs) {
                console.log(new Date(entry.ts).toISOString(), `[${entry.source}]`, entry.msg);
            }
            console.log("----- end client logs -----");
        }
    }
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

    let cdp: CDPSession | null = null;

    try {
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
        await expect(roomHeading).toHaveText("Room: 0/5", { timeout: 5_000 });

        const nameInput = page.getByRole("textbox", { name: /name/i });
        log('fill name "Foo"');
        await nameInput.fill("Foo");
        log("press Enter to join room");
        await nameInput.press("Enter");

        log("wait for navigation to /room");
        await page.waitForURL("**/room", { timeout: 15_000 });
        log("wait for Match text");
        await expect(page.getByText(/Match:/)).toBeVisible({ timeout: 5_000 });

        log("hard reload (ignore cache)");
        cdp = await page.context().newCDPSession(page);
        await cdp.send("Network.clearBrowserCache");
        await cdp.send("Network.clearBrowserCookies");
        await cdp.send("Page.reload", { ignoreCache: true });
        log("wait for redirect back to /");
        await page.waitForURL("http://localhost:4000/", { timeout: 15_000 });

        roomHeading = page.getByRole("heading", { level: 1, name: /Room:/i });
        log(`check to see if the previous session has been terminated: [${await roomHeading.textContent()}]`);
        await expect(roomHeading).toHaveText("Room: 0/5", { timeout: 5_000 });

        await expect
            .poll(() => scrapeMetric(request, "socket_registered_clients"), {
                timeout: 8_000,
                intervals: [500, 1000, 1500, 2000],
            })
            .toBe(0);

        // Dump a summary of metrics for visibility.
        try {
            const metricsRes = await request.get("/metrics");
            if (metricsRes.ok()) {
                const metricsText = await metricsRes.text();
                console.log("----- metrics snapshot -----");
                for (const line of metricsText.split("\n")) {
                    if (line.startsWith("socket_")) console.log(line);
                }
                console.log("----- end metrics snapshot -----");
            }
        } catch (metricsError) {
            log(`Failed to fetch metrics: ${metricsError}`);
        }
    } catch (error) {
        log(`TEST ERROR: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Stack trace: ${error.stack}`);
        }
        throw error; // Re-throw after logging
    } finally {
        // Always collect logs for debugging, even on failure
        await collectAndPrintMergedLogs(clientLogs, request);

        // Cleanup CDP session if it was created
        if (cdp) {
            try {
                await cdp.detach();
            } catch (cleanupError) {
                log(`Failed to detach CDP session: ${cleanupError}`);
            }
        }
    }
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

    let contextA: BrowserContext | null = null;
    let contextB: BrowserContext | null = null;

    try {
        contextA = await browser.newContext({ baseURL: "http://localhost:4000" });
        contextB = await browser.newContext({ baseURL: "http://localhost:4000" });

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
        await expect(playersA).toBeVisible({ timeout: 5_000 });
        log("assert #players has 5 children");
        await expect(playersA.locator("> div")).toHaveCount(5, { timeout: 5_000 });
    } catch (error) {
        log(`TEST ERROR: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Stack trace: ${error.stack}`);
        }
        throw error; // Re-throw after logging
    } finally {
        // Always close contexts, even on failure
        const closePromises: Promise<void>[] = [];
        if (contextA) {
            closePromises.push(
                contextA.close().catch((err) => {
                    log(`Failed to close contextA: ${err}`);
                })
            );
        }
        if (contextB) {
            closePromises.push(
                contextB.close().catch((err) => {
                    log(`Failed to close contextB: ${err}`);
                })
            );
        }
        await Promise.all(closePromises);

        // Always collect logs for debugging, even on failure
        await collectAndPrintMergedLogs(clientLogs, request);
    }
});

test(roomFlowTestNames.turnChangeUpdatesHighlight, async ({ browser, request }) => {
    /**
     * Test that when player 1 submits a valid word, the turn changes to player 2,
     * and the inputDomHighlight value is updated to the new matchLetter's first step.
     */

    async function assertHighlightValue(page: Page, highlightInputLocator: Locator) {
        const currentMatchLetterDisplay = await getMatchLetterDisplay(page);
        if (!currentMatchLetterDisplay) throw new Error("No match letter found");
        const highlightInputValue = await highlightInputLocator.inputValue();
        const highlightExpectValue = decomposeSyllable(currentMatchLetterDisplay)[0];
        expect(highlightInputValue).toBe(highlightExpectValue);
        return highlightExpectValue;
    }

    async function getMatchLetterDisplay(page: Page) {
        const r = await page.getByText(/Match Letter/i).locator("..").getByText(/[가-힣]/).textContent();
        if (!r) throw new Error("No match letter found");
        return r;
    }

    const baseURL = "http://localhost:4000";
    const clientLogs: LogEntry[] = [];
    const log = (message: string) => {
        const ts = Date.now();
        const entry: LogEntry = { ts, msg: `[client] ${message}`, source: "client" };
        clientLogs.push(entry);
        console.log(new Date(ts).toISOString(), entry.msg);
    };

    let contextA: BrowserContext | null = null;
    let contextB: BrowserContext | null = null;

    try {
        contextA = await browser.newContext({ baseURL });
        contextB = await browser.newContext({ baseURL });

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

        const dom = {
            pageA: {
                input: pageA.getByRole("textbox", { name: /name/i }),
                highlightInput: pageA.locator('input[aria-hidden="true"]').first(),
                wordInput: pageA.locator("input:not([readonly])"),
                submitButton: pageA.getByRole("button", { name: /submit word/i }),
                loadingBlur: pageA.locator("div.backdrop-blur-sm"),
            },
            pageB: {
                input: pageB.getByRole("textbox", { name: /name/i }),
                highlightInput: pageB.locator('input[aria-hidden="true"]').first(),
                wordInput: pageB.locator("input:not([readonly])"),
                submitButton: pageB.getByRole("button", { name: /submit word/i }),
                loadingBlur: pageB.locator("div.backdrop-blur-sm"),
            },
        };

        // Go to the home page
        log("goto / on both pages");
        await Promise.all([pageA.goto("/"), pageB.goto("/")]);

        // Fill in the names
        log('fill name "Player1" on A');
        await dom.pageA.input.fill("Player1");
        log('fill name "Player2" on B');
        await dom.pageB.input.fill("Player2");

        // Press Enter on Page A, wait for the loading screen, then press Enter on Page B
        log("press Enter on both pages to join room");
        await expect(dom.pageA.input).toHaveValue("Player1", { timeout: 5_000 });
        await dom.pageA.input.press("Enter");
        await expect(dom.pageA.loadingBlur).toContainText("Waiting for game to start...", { timeout: 5_000 });
        await dom.pageB.input.press("Enter");

        await pageA.waitForURL("**/room", { timeout: 15_000 })
        await pageB.waitForURL("**/room", { timeout: 15_000 });

        // Make sure the lodaing screen is gone
        log("wait for game to start (status should be 'playing')");
        await expect(dom.pageA.loadingBlur).toHaveCount(0);
        await expect(dom.pageB.loadingBlur).toHaveCount(0);

        // Find the highlight input element (the one with aria-hidden="true")
        log("get initial highlight value from page A");
        const highlightValueA = await assertHighlightValue(pageA, dom.pageA.highlightInput);
        log(`initial highlight value on page A: ${highlightValueA}`);

        // Verify it's player 1's turn
        log("check if it's player 1's turn (wordInputA should exist and not be empty)");
        let isPageAEnabled = false;
        if (await dom.pageA.wordInput.isEnabled({ timeout: 5_000 })) {
            isPageAEnabled = true;
        }

        // Type a valid word starting with the matchLetter
        // For example, if matchLetter is "가", type "가나다"
        // Map Korean initial consonant (choseong) or first letter to a sample word
        // For testing, provide a few sample mappings
        const firstLetterToWord: Record<string, string> = {
            "가": "가나다",
            "나": "나비",
            "다": "다람쥐",
            "마": "마을",
            "바": "바다",
            "사": "사과",
        };
        const wordToSubmit = firstLetterToWord[await getMatchLetterDisplay(pageA)];
        log(`typing word: ${wordToSubmit}`);
        await dom.pageA.wordInput.fill(wordToSubmit, { timeout: 1_000 });

        log("submitting word");
        await dom.pageA.submitButton.click();

        // Wait for the turn to change - the input on the active page should become disabled
        log("waiting for turn to change (input on active page should become disabled)");
        await expect(dom.pageA.wordInput).toBeDisabled({ timeout: 5_000 });

        // Wait for the new matchLetter to appear (should be the last character of the submitted word)
        const expectedNewMatchLetter = wordToSubmit.slice(-1);
        log(`waiting for new matchLetter to be: ${expectedNewMatchLetter}`);
        Promise.all([
            expect(await getMatchLetterDisplay(pageA)).toBe(expectedNewMatchLetter),
            expect(await getMatchLetterDisplay(pageB)).toBe(expectedNewMatchLetter),
        ]);

        // Verify the input on page B is enabled
        log("verifying input on page B is enabled");
        await expect(dom.pageB.wordInput).toBeEnabled({ timeout: 5_000 });

        // Verify the input on page A is disabled
        log("verifying input on page A is disabled");
        await expect(dom.pageA.wordInput).toBeDisabled({ timeout: 5_000 });

        // Get highlight value on page B
        log("assert highlight value on page B is valid");
        const highlightValueB = await assertHighlightValue(pageB, dom.pageB.highlightInput);
        log(`highlight value on page B: ${highlightValueB}`);
    } catch (error) {
        log(`TEST ERROR: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Stack trace: ${error.stack}`);
        }
        throw error; // Re-throw after logging
    } finally {
        // Always close contexts, even on failure
        const closePromises: Promise<void>[] = [];
        if (contextA) {
            closePromises.push(
                contextA.close().catch((err) => {
                    log(`Failed to close contextA: ${err}`);
                })
            );
        }
        if (contextB) {
            closePromises.push(
                contextB.close().catch((err) => {
                    log(`Failed to close contextB: ${err}`);
                })
            );
        }
        await Promise.all(closePromises);

        // Always collect logs for debugging, even on failure
        await collectAndPrintMergedLogs(clientLogs, request);
    }
});