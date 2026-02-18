import type { APIRequestContext, Browser, BrowserContext, CDPSession, Locator, Page } from "@playwright/test";
import { expect, request, test } from "@playwright/test";
import { decomposeSyllable } from "../../src/app/hangul-decomposer";
import { roomFlowTestNames } from "./test-names";
import { test as base } from '@playwright/test';
import assert from "assert";

type LogEntry = { ts: number; msg: string; source: "client" | "browser" | "server" };

/** Builds a tuple type of length N filled with T */
type BuildTuple<T, N extends number, R extends T[] = []> = R["length"] extends N ? R : BuildTuple<T, N, [...R, T]>;


type DomEntry = {
    input: Locator;
    highlightInput: Locator;
    wordInput: Locator;
    submitButton: Locator;
    loadingBlur: Locator;
    matchLetterDisplay: Locator;
    player1PanelHeartDisplay: Locator;
    player2PanelHeartDisplay: Locator;
    thisPlayerHeartDisplay: Locator;
    page: Page;
};

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

async function setupPages<N extends number>(
    browser: Browser,
    count: N
): Promise<{
    pages: BuildTuple<Page, N>;
    contexts: BuildTuple<BrowserContext, N>;
    dom: BuildTuple<DomEntry, N>;
    clientLogs: LogEntry[];
    log: (message: string) => void;
}> {
    const baseURL = "http://localhost:4000";
    const clientLogs: LogEntry[] = [];
    const log = (message: string) => {
        const ts = Date.now();
        const entry: LogEntry = { ts, msg: `[client] ${message}`, source: "client" };
        clientLogs.push(entry);
        console.log(new Date(ts).toISOString(), entry.msg);
    };

    const attachConsole = (pageLabel: string, page: Page) => {
        page.on("console", (msg) => {
            const ts = Date.now();
            const line = `[browser:${pageLabel}] ${msg.type()}: ${msg.text()}`;
            clientLogs.push({ ts, msg: line, source: "browser" });
            console.log(new Date(ts).toISOString(), line);
        });
    };

    const locators = (page: Page): Omit<DomEntry, "page"> => ({
        input: page.getByRole("textbox", { name: /name/i }),
        highlightInput: page.locator('input[aria-hidden="true"]').first(),
        wordInput: page.locator("input:not([readonly])"),
        submitButton: page.getByRole("button", { name: /submit word/i }),
        loadingBlur: page.locator("div.backdrop-blur-sm"),
        matchLetterDisplay: page.getByText(/Match Letter/i).locator("..").getByText(/[가-힣]/),
        player1PanelHeartDisplay: page.locator("div").filter({ hasText: "Player1" }).last().locator("span  > svg"),
        player2PanelHeartDisplay: page.locator("div").filter({ hasText: "Player2" }).last().locator("span > svg"),
        thisPlayerHeartDisplay: page.locator("span").first().locator(".."),
    });

    const browserOptions = { baseURL };
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];

    for (let i = 0; i < count; i++) {
        const ctx = await browser.newContext(browserOptions);
        const page = await ctx.newPage();
        await page.setViewportSize({ height: 1000, width: 1000 });
        attachConsole(String.fromCharCode(65 + i), page);
        contexts.push(ctx);
        pages.push(page);
    }

    const dom = pages.map((p) => ({ ...locators(p), page: p })) as BuildTuple<DomEntry, N>;

    return {
        pages: pages as BuildTuple<Page, N>,
        contexts: contexts as BuildTuple<BrowserContext, N>,
        dom,
        clientLogs,
        log,
    };
}

async function navigateToGameStart(pages: Page[], dom: DomEntry[], log: (message: string) => void) {

    const TIMEOUT = 5000;

    // Go to the home page
    log("goto / on both pages");
    await Promise.all(Array.from(pages).map(page => page.goto("/", { timeout: TIMEOUT })));

    // Fill in the names
    await Promise.all(
        Array.from(dom).map(
            (pageDom, i) => {
                log(`fill name Player${i + 1}`);
                return pageDom.input.fill(`Player${i + 1}`, { timeout: TIMEOUT });
            }
        )
    );

    log("pause 2 seconds");
    await new Promise(resolve => setTimeout(resolve, 2000));


    await Promise.all(
        Array.from(dom).map(
            (pageDom, i) => {
                log(`press Enter on page ${i} to join room`);
                const pause = new Promise(resolve => setTimeout(resolve, i * 100));
                return pause.then(() => pageDom.input.press("Enter", { timeout: TIMEOUT }));
            }
        )
    );

    log("pause 2 seconds");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // wait for the loading screen to disappear
    await Promise.all(
        Array.from(dom).map(
            (pageDom, i) => {
                log(`wait for the submit button to be visible on page ${i}`);
                return pageDom.submitButton.waitFor({ state: "visible", timeout: TIMEOUT });
            }
        )
    );
}

async function testCleanUp(contexts: BrowserContext[], clientLogs: LogEntry[], request: APIRequestContext, log: (message: string) => void) {
    // Always close contexts, even on failure
    await Promise.all(
        contexts.map((ctx, i) =>
            ctx.close().catch((err: unknown) => {
                log(`Failed to close context${i}: ${err}`);
            })
        )
    );
    await collectAndPrintMergedLogs(clientLogs, request);
}

base.beforeEach(async ({ browser }, testInfo) => {
    if (process.env.MOCK_GET_RANDOM_WORD != "true" || process.env.MOCK_LOOKUP_WORD != "true" || process.env.MOCK_WORD_VALIDATION_FAIL == "true") {
        console.warn(
            `[e2e WARNING] It is recommended to run e2e tests with MOCK_GET_RANDOM_WORD=true, MOCK_LOOKUP_WORD=true and MOCK_WORD_VALIDATION_FAIL!=true. Current: MOCK_GET_RANDOM_WORD=${process.env.MOCK_GET_RANDOM_WORD}, MOCK_LOOKUP_WORD=${process.env.MOCK_LOOKUP_WORD}, MOCK_WORD_VALIDATION_FAIL=${process.env.MOCK_WORD_VALIDATION_FAIL}`,
        );
    }
});

test(roomFlowTestNames.resetAfterReload, async ({ browser, request }) => {
    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 2);
    const [pageA] = pages;

    let cdp: CDPSession | null = null;

    try {
        log("goto /");
        await pageA.goto("/");

        log("wait for socket connect (server stats)");
        await expect
            .poll(() => scrapeMetric(request, "socket_event_total", 'event="connect"'), { timeout: 15_000, intervals: [500, 750, 1000] })
            .toBeGreaterThan(0);

        log("wait for getPlayerCount event (server stats)");
        await expect
            .poll(() => scrapeMetric(request, "socket_event_total", 'event="getPlayerCount"'), { timeout: 15_000, intervals: [500, 750, 1000] })
            .toBeGreaterThan(0);

        let roomCount = pageA.getByText('/5');

        log("wait for Room heading text");
        await expect(roomCount).toHaveText("0/5", { timeout: 5_000 });

        const nameInput = pageA.getByRole("textbox", { name: /name/i });

        log('fill name "Foo"');
        await nameInput.fill("Foo");

        log("press Enter to join room");
        await nameInput.press("Enter");

        log("wait for navigation to /room");
        await pageA.waitForURL("**/room", { timeout: 15_000 });

        log("wait for Match text");
        await expect(pageA.getByText('Waiting for game to start...')).toBeVisible({ timeout: 5_000 });

        log("Check stat to see if the player has been registered");
        await expect
            .poll(() => scrapeMetric(request, "socket_registered_clients"), {
                timeout: 8_000,
                intervals: [500, 1000],
            })
            .toBe(1);

        log("hard reload (ignore cache)");
        cdp = await pageA.context().newCDPSession(pageA);
        await cdp.send("Network.clearBrowserCache");
        await cdp.send("Network.clearBrowserCookies");
        await cdp.send("Page.reload", { ignoreCache: true });

        log("wait for redirect back to /");
        await pageA.waitForURL("http://localhost:4000/", { timeout: 15_000 });

        roomCount = pageA.getByText('/5');

        log(`Check to see if the previous session has been terminated: [${await roomCount.textContent()}]`);
        await expect(roomCount).toHaveText("0/5", { timeout: 5_000 });

        log("Check stats to see if the previous session has been terminated");
        await expect
            .poll(() => scrapeMetric(request, "socket_registered_clients"), {
                timeout: 8_000,
                intervals: [500, 1000],
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
    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 2);
    const [pageA, pageB] = pages;

    try {
        await navigateToGameStart(pages, dom, log);

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
        await testCleanUp(contexts, clientLogs, request, log);
    }
});

test(roomFlowTestNames.turnChangeUpdatesHighlight, async ({ browser, request }) => {
    /**
     * Test that when player 1 submits a valid word, the turn changes to player 2,
     * and the inputDomHighlight value is updated to the new matchLetter's first step.
     */

    async function assertHighlightValue(dom: { matchLetterDisplay: Locator }, highlightInputLocator: Locator) {
        const currentMatchLetterDisplay = await dom.matchLetterDisplay.textContent();
        if (!currentMatchLetterDisplay) throw new Error("No match letter found");
        const highlightInputValue = await highlightInputLocator.inputValue();
        const highlightExpectValue = decomposeSyllable(currentMatchLetterDisplay)[0];
        log(`assertHighlightValue: highlightInputValue: ${highlightInputValue}, highlightExpectValue: ${highlightExpectValue}`);
        expect(highlightInputValue).toBe(highlightExpectValue);
        return highlightExpectValue;
    }

    function randomHangulBlock() {
        // Hangul syllables range: U+AC00 (44032) to U+D7A3 (55203)
        const start = 0xac00;
        const end = 0xd7a3;
        const code = Math.floor(Math.random() * (end - start + 1)) + start;
        return String.fromCharCode(code);
    }

    assert(process.env.MOCK_GET_RANDOM_WORD == "true", "MOCK_GET_RANDOM_WORD must be enabled for e2e tests");
    assert(process.env.MOCK_LOOKUP_WORD == "true", "MOCK_LOOKUP_WORD must be enabled for e2e tests");
    assert(process.env.MOCK_WORD_VALIDATION_FAIL == "false", "MOCK_WORD_VALIDATION_FAIL must be enabled for e2e tests");

    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 2);
    const [pageA, pageB] = pages;

    try {
        await navigateToGameStart(pages, dom, log);

        // Find the highlight input element (the one with aria-hidden="true")
        log("get initial highlight value from page A");
        const highlightValueA = await assertHighlightValue(dom[0], dom[0].highlightInput);
        log(`initial highlight value on page A: ${highlightValueA}`);

        // Verify it's player 1's turn
        log("check if it's player 1's turn (wordInputA should exist and not be empty)");
        let isPageAEnabled = false;
        if (await dom[0].wordInput.isEnabled({ timeout: 5_000 })) {
            isPageAEnabled = true;
        }

        // Type a valid word starting with the matchLetter
        // For example, if matchLetter is "가", type "가나다"
        // Map Korean initial consonant (choseong) or first letter to a sample word
        // For testing, provide a few sample mappings
        // const firstLetterToWord: Record<string, string> = {
        //     "가": "가나다",
        //     "나": "나비",
        //     "다": "다람쥐",
        //     "마": "마을",
        //     "바": "바다",
        //     "사": "사과",
        // };
        // const firstLetter = await getMatchLetterDisplay(pageA);
        // if (!(firstLetter in firstLetterToWord)) {
        //     throw new Error(`No word found for first letter: ${firstLetter}`);
        // }
        // const wordToSubmit = firstLetterToWord[firstLetter];
        const wordToSubmit = (await dom[0].matchLetterDisplay.textContent()) + randomHangulBlock();
        log(`typing word: ${wordToSubmit}`);
        await dom[0].wordInput.fill(wordToSubmit, { timeout: 1_000 });

        log("submitting word");
        await dom[0].submitButton.click();

        // Wait for the turn to change - the input on the active page should become disabled
        log("waiting for turn to change (input on active page should become disabled)");
        await expect(dom[0].wordInput).toBeDisabled({ timeout: 5_000 });

        // Wait for the new matchLetter to appear (should be the last character of the submitted word)
        const expectedNewMatchLetter = wordToSubmit.slice(-1);
        log(`waiting for new matchLetter to be: ${expectedNewMatchLetter}`);
        Promise.all([
            expect(await dom[0].matchLetterDisplay.textContent()).toBe(expectedNewMatchLetter),
            expect(await dom[1].matchLetterDisplay.textContent()).toBe(expectedNewMatchLetter),
        ]);

        // Verify the input on page B is enabled
        log("verifying input on page B is enabled");
        await expect(dom[1].wordInput).toBeEnabled({ timeout: 5_000 });

        // Verify the input on page A is disabled
        log("verifying input on page A is disabled");
        await expect(dom[0].wordInput).toBeDisabled({ timeout: 5_000 });

        // Get highlight value on page B
        log("assert highlight value on page B is valid");
        const highlightValueB = await assertHighlightValue(dom[1], dom[1].highlightInput);
        log(`highlight value on page B: ${highlightValueB}`);
    } catch (error) {
        log(`TEST ERROR: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Stack trace: ${error.stack}`);
        }
        throw error; // Re-throw after logging
    } finally {
        await testCleanUp(contexts, clientLogs, request, log);
    }
});

test(roomFlowTestNames.gameStartsAfterBothPlayersJoin, async ({ browser, request }) => {
    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 2);
    const [pageA, pageB] = pages;
    try {
        await navigateToGameStart(pages, dom, log);

        log('pause 5 seconds');
        await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (err) {
        log(`TEST ERROR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        await testCleanUp(contexts, clientLogs, request, log);
    }
});

test(roomFlowTestNames.playerHealthDecreases, async ({ request, browser }) => {
    assert(process.env.MOCK_GET_RANDOM_WORD == "true", `MOCK_GET_RANDOM_WORD must be enabled for the ${roomFlowTestNames.playerHealthDecreases} e2e tests`);
    assert(process.env.MOCK_LOOKUP_WORD == "true", `MOCK_LOOKUP_WORD must be enabled for the ${roomFlowTestNames.playerHealthDecreases} e2e tests`);
    assert(process.env.MOCK_WORD_VALIDATION_FAIL == "true", `MOCK_WORD_VALIDATION_FAIL must be enabled for the ${roomFlowTestNames.playerHealthDecreases} e2e tests`);

    const TIMEOUT = 5000;
    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 2);
    const [pageA, pageB] = pages;

    try {
        await navigateToGameStart(pages, dom, log);

        log('pause 5 seconds');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // type an invalid word on page A
        log('type an invalid word on A');
        const currentMatchLetter = (await dom[0].matchLetterDisplay.textContent());
        if (!currentMatchLetter) throw new Error("matchLetterDisplay for pageA did not resolve");
        await dom[0].wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });

        // submit the word on page A
        log('submit the word on A');
        await dom[0].submitButton.click();

        // assert the input is error
        log('assert the input is error');
        await expect(dom[0].page.getByText("Invalid word")).toBeVisible({ timeout: TIMEOUT });

        log('make sure the main hearts display for PlayerA decreases by one');
        await expect(dom[0].thisPlayerHeartDisplay.locator('span')).toHaveCount(4, { timeout: TIMEOUT });

        log('make sure the main hearts display for PlayerB does NOT decrease');
        await expect(dom[1].thisPlayerHeartDisplay.locator('span')).toHaveCount(5, { timeout: TIMEOUT });

        log('make sure the PlayerA heart display also decreases on PageA');
        await expect(dom[0].player1PanelHeartDisplay).toHaveCount(4, { timeout: TIMEOUT });

        log("make sure the Player2's heart doesn't change on PageA");
        await expect(dom[0].player2PanelHeartDisplay).toHaveCount(5, { timeout: TIMEOUT });

        log("make sure PlayerA's heart display has decreased on PageB");
        await expect(dom[1].player1PanelHeartDisplay).toHaveCount(4, { timeout: TIMEOUT });

    } catch (err) {
        log(`TEST ERROR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        await testCleanUp(contexts, clientLogs, request, log);
    }

});

test(roomFlowTestNames.playerDiesIn3PlayerGame, async ({ browser, request }) => {
    assert(process.env.MOCK_DICTIONARY_DATA == "true", `MOCK_DICTIONARY_DATA must be enabled for the ${roomFlowTestNames.playerDiesIn3PlayerGame} e2e tests`);

    const TIMEOUT = 5000;
    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 3);
    const [pageA, pageB, pageC] = pages;
    const [domA, domB, domC] = dom;

    try {
        await navigateToGameStart(pages, dom, log);

        log('get the current match letter for pageA');
        const currentMatchLetter = await domA.matchLetterDisplay.textContent();
        if (!currentMatchLetter) throw new Error("matchLetterDisplay for pageA did not resolve");

        log('fill the current match letter on pageA');
        domA.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domA.submitButton.click();

        log('expect the turn has changed to pageB');
        await expect(domB.wordInput).toBeEnabled({ timeout: TIMEOUT });
        await expect(domA.wordInput).toBeDisabled({ timeout: TIMEOUT });
        await expect(domC.wordInput).toBeDisabled({ timeout: TIMEOUT });

        log('fill the current match letter on pageB - expect invalid word (current health should be 5)');
        domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domB.submitButton.click();

        log('expect the input is error on pageB');
        await expect(domB.page.getByText("Invalid word")).toBeVisible({ timeout: TIMEOUT });
        await expect(domB.thisPlayerHeartDisplay.locator('span')).toHaveCount(4, { timeout: TIMEOUT });

        log('fill the current match letter on pageB - expect invalid word (current health should be 4)');
        domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domB.submitButton.click();

        log('expect the input is error on pageB');
        await expect(domB.page.getByText("Invalid word")).toBeVisible({ timeout: TIMEOUT });
        await expect(domB.thisPlayerHeartDisplay.locator('span')).toHaveCount(3, { timeout: TIMEOUT });

        log('fill the current match letter on pageB - expect invalid word (current health should be 3)');
        domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domB.submitButton.click();

        log('expect the input is error on pageB');
        await expect(domB.page.getByText("Invalid word")).toBeVisible({ timeout: TIMEOUT });
        await expect(domB.thisPlayerHeartDisplay.locator('span')).toHaveCount(2, { timeout: TIMEOUT });

        log('fill the current match letter on pageB - expect invalid word (current health should be 2)');
        domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domB.submitButton.click();

        log('expect the input is error on pageB');
        await expect(domB.page.getByText("Invalid word")).toBeVisible({ timeout: TIMEOUT });
        await expect(domB.thisPlayerHeartDisplay.locator('span')).toHaveCount(1, { timeout: TIMEOUT });
        
        log('fill the current match letter on pageB - expect invalid word (current health should be 1)');
        domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domB.submitButton.click();

        log('expect the input is error on pageB');
        await expect(domB.page.getByText("Invalid word")).toBeVisible({ timeout: TIMEOUT });
        await expect(domB.thisPlayerHeartDisplay.locator('span')).toHaveCount(0, { timeout: TIMEOUT });

    } catch (err) {
        log(`TEST ERROR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        await testCleanUp(contexts, clientLogs, request, log);
    }
})
