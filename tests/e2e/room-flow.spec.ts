import type { APIRequestContext, Browser, BrowserContext, CDPSession, Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { decomposeSyllable } from "@/app/hangul-decomposer";
import { envGet } from "@/server/env";
import { E2ETestAssertionError, TestEnvError } from "@/shared/errors";
import { MAX_PLAYERS } from "@/shared/consts";
import { roomFlowTestNames } from "@tests/e2e/test-names";

type LogEntry = { ts: number; msg: string; source: "client" | "browser" | "server" };

/** Builds a tuple type of length N filled with T */
type BuildTuple<T, N extends number, R extends T[] = []> = R["length"] extends N ? R : BuildTuple<T, N, [...R, T]>;

type DomEntry = {
    homepageInput: Locator;
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

function assertEnvVarEquals(vars: Record<string, string>, testTitle: string) {
    const errors: string[] = [];
    for (const [varName, expectedValue] of Object.entries(vars)) {
        if (envGet(varName as keyof typeof process.env) != expectedValue) {
            errors.push(
                `${varName} must be ${expectedValue === "true" ? "enabled" : "disabled"} for the ${testTitle} e2e tests`
            );
        }
    }
    if (errors.length > 0) {
        throw new TestEnvError(
            errors.join('\n') +
            "\nActual: " + JSON.stringify(Object.fromEntries(Object.entries(vars).map(([k]) => [k, envGet(k as keyof typeof process.env)])), null, 2) +
            "\nExpected: " + JSON.stringify(vars, null, 2)
        );
    }
}

const E2E_TIMEOUT = 30_000;

async function pause(seconds: number) {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function roomIdFromUrl(url: string): string {
    const match = url.match(/\/room\/([^/?#]+)/);
    if (!match) throw new E2ETestAssertionError(`Expected /room/:id URL, got ${url}`);
    return match[1];
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
    const baseURL = "http://localhost:3000";
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

    const playerPanelHearts = (page: Page, playerName: string) =>
        page
            .locator("#players > *")
            .filter({ has: page.getByRole("heading", { name: new RegExp(`^${playerName}`) }) })
            .locator("span > svg");

    const locators = (page: Page): Omit<DomEntry, "page"> => ({
        homepageInput: page.getByRole("textbox", { name: /your name/i }),
        highlightInput: page.locator('input[aria-hidden="true"]').first(),
        wordInput: page.locator('input[type="text"]:not([readonly]):not([aria-hidden="true"])'),
        submitButton: page.getByRole("button", { name: /submit word/i }),
        loadingBlur: page.locator("div.backdrop-blur-sm"),
        matchLetterDisplay: page
            .getByRole("heading", { name: /match letter/i })
            .locator("..")
            .locator(".text-8xl"),
        player1PanelHeartDisplay: playerPanelHearts(page, "Player1"),
        player2PanelHeartDisplay: playerPanelHearts(page, "Player2"),
        thisPlayerHeartDisplay: page.locator("div.panel.rounded-lg").filter({
            has: page.locator("span > svg"),
        }),
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

async function enterNameAndOpenLobby(page: Page, name: string, log: (message: string) => void) {
    log(`goto / and enter lobby as ${name}`);
    await page.goto("/", { timeout: E2E_TIMEOUT });
    await page.getByRole("textbox", { name: /your name/i }).waitFor({ state: "visible", timeout: E2E_TIMEOUT });
    await page.getByRole("textbox", { name: /your name/i }).fill(name);
    await page.getByRole("button", { name: /go to lobby/i }).click();
    await page.waitForURL("**/lobby", { timeout: E2E_TIMEOUT });
}

async function hostCreateRoom(
    page: Page,
    log: (message: string) => void,
    roomName = `E2E Room ${Date.now()}`
): Promise<{ roomId: string; roomName: string }> {
    log(`host: create & join room "${roomName}"`);
    await page.getByPlaceholder(/room name/i).fill(roomName);
    await page.getByRole("button", { name: /create & join/i }).click();
    try {
        await page.waitForURL("**/room/**", { timeout: E2E_TIMEOUT, waitUntil: "commit" });
        await waitForSoloRoomPageReady(page);
    } catch {
        const errorText = await page
            .locator("p")
            .filter({ hasText: /failed|error|could not/i })
            .first()
            .textContent()
            .catch(() => null);
        throw new E2ETestAssertionError(
            `Host failed to create room${errorText ? `: ${errorText}` : ""} (url: ${page.url()})`
        );
    }
    const roomId = roomIdFromUrl(page.url());
    log(`host: room id ${roomId}`);
    return { roomId, roomName };
}


async function waitForSoloRoomPageReady(page: Page) {
    await page.waitForURL("**/room/**", { timeout: E2E_TIMEOUT });
    await expect(page.locator("input:not(:disabled)")).toHaveCount(1, { timeout: E2E_TIMEOUT });
}

async function waitForRoomPageReady(page: Page) {
    await page.waitForURL("**/room/**", { timeout: E2E_TIMEOUT });
    await expect(page.getByText(/could not join this room/i)).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/joining room/i)).not.toBeVisible({ timeout: E2E_TIMEOUT });
    await expect(
        page.getByText(/Waiting for game to start.../i)
    ).toBeVisible({ timeout: E2E_TIMEOUT });
}

async function joinRoomPage(page: Page, roomId: string, log: (message: string) => void) {
    log(`join room ${roomId}`);
    await page.goto(`/room/${roomId}`, { timeout: E2E_TIMEOUT });
    await waitForRoomPageReady(page);
}

async function waitForHostCanStart(hostPage: Page) {
    await expect
        .poll(
            async () => hostPage.getByRole("button", { name: /^start game$/i }).isVisible(),
            { timeout: 30_000, intervals: [250, 500, 1000] }
        )
        .toBe(true);
}

async function navigateToGameStart(
    pages: Page[],
    dom: DomEntry[],
    log: (message: string) => void,
    options: { startGame?: boolean } = {}
) {
    const { startGame = true } = options;
    const [hostPage, ...guestPages] = pages;

    for (let i = 0; i < pages.length; i++) {
        await enterNameAndOpenLobby(pages[i], `Player${i + 1}`, log);
    }

    const { roomId } = await hostCreateRoom(hostPage, log);

    for (const guestPage of guestPages) {
        await joinRoomPage(guestPage, roomId, log);
    }

    // if (guestPages.length > 0) {
    //     log("host: reload to pick up joined player count");
    //     await hostPage.reload();
    //     await waitForRoomPageReady(hostPage);
    // }

    await waitForHostCanStart(hostPage);

    if (!startGame) {
        return;
    }

    log("host: start game");
    await hostPage.getByRole("button", { name: /^start game$/i }).click();
    await hostPage.evaluate(async (id) => {
        await fetch(`/api/rooms/${id}/start`, { method: "POST" });
    }, roomId);

    // log("reload clients after game start");
    // for (const page of pages) {
    //     await page.reload();
    //     await waitForRoomPageReady(page);
    // }

    log("wait until at least one client can submit");
    await expect
        .poll(
            async () => {
                for (const entry of dom) {
                    if (await entry.submitButton.isEnabled()) return true;
                }
                return false;
            },
            { timeout: E2E_TIMEOUT, intervals: [250, 500, 1000] }
        )
        .toBe(true);
}

async function expectWinner(page: Page, winnerName: string) {
    await expect(page.getByText("Winner is:")).toBeVisible({ timeout: E2E_TIMEOUT });
    await expect(
        page.locator(".stat-value").filter({ hasText: winnerName })
    ).toBeVisible({ timeout: E2E_TIMEOUT });
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

test.beforeEach(async () => {
    if (envGet("MOCK_GET_RANDOM_WORD") != "true" || envGet("MOCK_LOOKUP_WORD") != "true" || envGet("MOCK_WORD_VALIDATION_FAIL") == "true") {
        console.warn(
            `[e2e WARNING] It is recommended to run e2e tests with MOCK_GET_RANDOM_WORD=true, MOCK_LOOKUP_WORD=true and MOCK_WORD_VALIDATION_FAIL!=true. Current: MOCK_GET_RANDOM_WORD=${envGet("MOCK_GET_RANDOM_WORD")}, MOCK_LOOKUP_WORD=${envGet("MOCK_LOOKUP_WORD")}, MOCK_WORD_VALIDATION_FAIL=${envGet("MOCK_WORD_VALIDATION_FAIL")}`,
        );
    }
});

test(roomFlowTestNames.resetAfterReload, async ({ browser, request }, testInfo) => {
    assertEnvVarEquals(
        { MOCK_GET_RANDOM_WORD: "true", MOCK_LOOKUP_WORD: "true", MOCK_WORD_VALIDATION_FAIL: "false" },
        testInfo.title
    );

    const { pages, contexts, clientLogs, log } = await setupPages(browser, 1);
    const [pageA] = pages;

    let cdp: CDPSession | null = null;

    try {
        await enterNameAndOpenLobby(pageA, "Foo", log);
        const { roomId } = await hostCreateRoom(pageA, log, `E2E Reset ${Date.now()}`);
        await waitForSoloRoomPageReady(pageA);
        void roomId;

        log("hard reload with cleared site data");
        cdp = await pageA.context().newCDPSession(pageA);
        await cdp.send("Network.clearBrowserCache");
        await cdp.send("Network.clearBrowserCookies");
        await pageA.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await cdp.send("Page.reload", { ignoreCache: true });

        log("expect redirect to home after reload without persisted session");
        await expect(pageA).not.toHaveURL(/\/room\//, { timeout: E2E_TIMEOUT });
        await expect(pageA.getByRole("textbox", { name: /your name/i })).toBeVisible({ timeout: E2E_TIMEOUT });
    } catch (error) {
        log(`TEST ERROR: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Stack trace: ${error.stack}`);
        }
        throw error;
    } finally {
        if (cdp) {
            try {
                await cdp.detach();
            } catch (cleanupError) {
                log(`Failed to detach CDP session: ${cleanupError}`);
            }
        }
        await testCleanUp(contexts, clientLogs, request, log);
    }
});

test(roomFlowTestNames.dualBrowserJoin, async ({ browser, request }, testInfo) => {
    // Assert appropriate env
    assertEnvVarEquals(
        { MOCK_GET_RANDOM_WORD: "true", MOCK_LOOKUP_WORD: "true", MOCK_WORD_VALIDATION_FAIL: "false" },
        testInfo.title
    );

    /**
     * Regression guard: verify two isolated browsers can both join a room and render all player slots.
     */
    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 2);
    const [pageA, pageB] = pages;

    try {
        await navigateToGameStart(pages, dom, log);
        const playersA = pageA.locator("#players");

        log("assert #players visible");
        await expect(playersA).toBeVisible({ timeout: 5_000 });

        log(`assert #players has ${MAX_PLAYERS} children`);
        await expect(playersA.locator("> *")).toHaveCount(MAX_PLAYERS, { timeout: E2E_TIMEOUT });
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

test(roomFlowTestNames.turnChangeUpdatesHighlight, async ({ browser, request }, testInfo) => {
    // Assert appropriate env
    assertEnvVarEquals(
        { MOCK_GET_RANDOM_WORD: "true", MOCK_LOOKUP_WORD: "true", MOCK_WORD_VALIDATION_FAIL: "false" },
        testInfo.title
    );

    async function assertHighlightValue(dom: { matchLetterDisplay: Locator }, highlightInputLocator: Locator) {
        const currentMatchLetterDisplay = await dom.matchLetterDisplay.textContent();
        if (!currentMatchLetterDisplay) throw new E2ETestAssertionError("Match letter display not found");
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

    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 2);
    const [pageA, pageB] = pages;

    try {
        await navigateToGameStart(pages, dom, log);

        log("find which client has the opening turn");
        let activeDom = dom[0];
        let inactiveDom = dom[1];
        if (!(await dom[0].wordInput.isEnabled({ timeout: E2E_TIMEOUT }))) {
            if (await dom[1].wordInput.isEnabled({ timeout: E2E_TIMEOUT })) {
                activeDom = dom[1];
                inactiveDom = dom[0];
            } else {
                throw new E2ETestAssertionError("No enabled word input after game start");
            }
        }

        log("get initial highlight value from active player");
        const highlightValueActive = await assertHighlightValue(activeDom, activeDom.highlightInput);
        log(`initial highlight value: ${highlightValueActive}`);

        const matchLetter = await activeDom.matchLetterDisplay.textContent();
        if (!matchLetter) throw new E2ETestAssertionError("Match letter display not found");
        const wordToSubmit = matchLetter + randomHangulBlock();
        log(`typing word: ${wordToSubmit}`);
        await activeDom.wordInput.fill(wordToSubmit, { timeout: E2E_TIMEOUT });

        log("submitting word");
        await activeDom.submitButton.click();

        log("waiting for turn to change");
        await expect(activeDom.wordInput).toBeDisabled({ timeout: E2E_TIMEOUT });

        const expectedNewMatchLetter = wordToSubmit.slice(-1);
        log(`waiting for new matchLetter to be: ${expectedNewMatchLetter}`);
        await expect(activeDom.matchLetterDisplay).toHaveText(expectedNewMatchLetter, { timeout: E2E_TIMEOUT });
        await expect(inactiveDom.matchLetterDisplay).toHaveText(expectedNewMatchLetter, { timeout: E2E_TIMEOUT });

        log("verifying turn moved to the other player");
        await expect(inactiveDom.wordInput).toBeEnabled({ timeout: E2E_TIMEOUT });
        await expect(activeDom.wordInput).toBeDisabled({ timeout: E2E_TIMEOUT });

        log("assert highlight value on the new active player");
        const highlightValueNext = await assertHighlightValue(inactiveDom, inactiveDom.highlightInput);
        log(`highlight value after turn change: ${highlightValueNext}`);
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

test(roomFlowTestNames.gameStartsAfterBothPlayersJoin, async ({ browser, request }, testInfo) => {
    // Assert appropriate env
    assertEnvVarEquals(
        { MOCK_GET_RANDOM_WORD: "true", MOCK_LOOKUP_WORD: "true", MOCK_WORD_VALIDATION_FAIL: "false" },
        testInfo.title
    );

    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 2);
    const [pageA] = pages;
    try {
        await navigateToGameStart(pages, dom, log, { startGame: false });

        log("both players see waiting overlay");
        await expect(pageA.getByText(/waiting for game to start/i)).toBeVisible({ timeout: E2E_TIMEOUT });
        await expect(pages[1].getByText(/waiting for game to start/i)).toBeVisible({ timeout: E2E_TIMEOUT });

        log("host starts the game");
        await pageA.getByRole("button", { name: /^start game$/i }).click();

        log("playing UI appears on both clients");
        await expect(dom[0].submitButton).toBeVisible({ timeout: E2E_TIMEOUT });
        await expect(dom[1].submitButton).toBeVisible({ timeout: E2E_TIMEOUT });
    } catch (err) {
        log(`TEST ERROR: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
    } finally {
        await testCleanUp(contexts, clientLogs, request, log);
    }
});

// ========================================
// ============ CUSTOM RUNNER =============
// ========================================

test(roomFlowTestNames.playerHealthDecreases, async ({ request, browser }, testInfo) => {
    if (envGet("CUSTOM_PLAYWRIGHT_RUNNER") !== "true") test.skip();
    assertEnvVarEquals(
        { MOCK_GET_RANDOM_WORD: "true", MOCK_LOOKUP_WORD: "true", MOCK_WORD_VALIDATION_FAIL: "true" },
        testInfo.title
    );

    const TIMEOUT = E2E_TIMEOUT;
    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 2);

    try {
        await navigateToGameStart(pages, dom, log);

        // type an invalid word on page A
        log('type an invalid word on A');
        const currentMatchLetter = (await dom[0].matchLetterDisplay.textContent());
        if (!currentMatchLetter) throw new E2ETestAssertionError("Match letter display for pageA did not resolve");
        await dom[0].wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });

        // submit the word on page A
        log('submit the word on A');
        await dom[0].submitButton.click();

        // assert the input is error
        
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
        throw err;
    } finally {
        await testCleanUp(contexts, clientLogs, request, log);
    }

});

test(roomFlowTestNames.playerDiesIn3PlayerGame, async ({ browser, request }, testInfo) => {
    if (envGet("CUSTOM_PLAYWRIGHT_RUNNER") !== "true") test.skip();
    assertEnvVarEquals({ MOCK_DICTIONARY_DATA: "true" }, testInfo.title);

    const TIMEOUT = E2E_TIMEOUT;
    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 3);
    const [domA, domB, domC] = dom;

    try {
        await navigateToGameStart(pages, dom, log);

        log('get the current match letter for pageA');
        const currentMatchLetter = await domA.matchLetterDisplay.textContent();
        if (!currentMatchLetter) throw new E2ETestAssertionError("Match letter display for pageA did not resolve");

        log('fill the current match letter on pageA');
        await domA.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domA.submitButton.click();

        log('expect the turn to change from pageA to pageB');
        await expect(domA.page.getByText("Not your turn")).toBeVisible({ timeout: TIMEOUT });
        await expect(domB.wordInput).toBeEnabled({ timeout: TIMEOUT });
        await expect(domC.wordInput).toBeDisabled({ timeout: TIMEOUT });

        log('fill the current match letter on pageB - expect invalid word (current health should be 5)');
        await domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domB.submitButton.click();

        log('expect the input is error on pageB');
        await expect(domB.thisPlayerHeartDisplay.locator('span')).toHaveCount(4, { timeout: TIMEOUT });

        log('fill the current match letter on pageB - expect invalid word (current health should be 4)');
        await domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domB.submitButton.click();

        log('expect the input is error on pageB');
        await expect(domB.thisPlayerHeartDisplay.locator('span')).toHaveCount(3, { timeout: TIMEOUT });

        log('fill the current match letter on pageB - expect invalid word (current health should be 3)');
        await domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domB.submitButton.click();

        log('expect the input is error on pageB');
        await expect(domB.thisPlayerHeartDisplay.locator('span')).toHaveCount(2, { timeout: TIMEOUT });

        log('fill the current match letter on pageB - expect invalid word (current health should be 2)');
        await domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domB.submitButton.click();

        log('expect the input is error on pageB');
        await expect(domB.thisPlayerHeartDisplay.locator('span')).toHaveCount(1, { timeout: TIMEOUT });

        log('fill the current match letter on pageB - expect invalid word (current health should be 1)');
        await domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domB.submitButton.click({ timeout: TIMEOUT });

        log('expect there to be an svg icon (X instead of a heart)');
        await expect(domB.thisPlayerHeartDisplay.locator('span')).toHaveCount(1, { timeout: TIMEOUT });

        log('expect the turn to be on Player3');
        await expect(domB.page.getByText("Not your turn")).toBeVisible({ timeout: TIMEOUT });
        await expect(domC.wordInput).toBeEnabled({ timeout: TIMEOUT });
        await expect(domA.wordInput).toBeDisabled({ timeout: TIMEOUT });

        log('fill Player3 and go to next turn');
        await domC.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domC.submitButton.click();

        log('expect Player3 to be disabled')
        await expect(domC.wordInput).toBeDisabled({ timeout: TIMEOUT });

        log('expect Player1 to be enabled')
        await expect(domA.wordInput).toBeEnabled({ timeout: TIMEOUT });

        log('fill Player1 and go to next turn');
        await domA.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domA.submitButton.click();

        log('expect Player1 to be disabled')
        await expect(domA.wordInput).toBeDisabled({ timeout: TIMEOUT });

        log('expect Player2 to be disabled (skipped)')
        await expect(domB.wordInput).toBeDisabled({ timeout: TIMEOUT });

        log('expect Player3 to be enabled')
        await expect(domC.wordInput).toBeEnabled({ timeout: TIMEOUT });


    } catch (err) {
        log(`TEST ERROR: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
    } finally {
        await testCleanUp(contexts, clientLogs, request, log);
    }
});

// End Screen Releated

test(roomFlowTestNames.endGameWith2Players, async ({ browser, request }, testInfo) => {
    if (envGet("CUSTOM_PLAYWRIGHT_RUNNER") !== "true") test.skip();
    assertEnvVarEquals(
        { MOCK_GET_RANDOM_WORD: "true", MOCK_LOOKUP_WORD: "true", MOCK_WORD_VALIDATION_FAIL: "true" },
        testInfo.title
    );

    const TIMEOUT = E2E_TIMEOUT;
    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 2);
    const [domA, domB] = dom;

    try {
        await navigateToGameStart(pages, dom, log);
        const currentMatchLetter = await domA.matchLetterDisplay.textContent({ timeout: TIMEOUT });
        if (!currentMatchLetter) throw new E2ETestAssertionError("Match letter display for pageA did not resolve");

        for (let i = 0, max = 4; i < max; i++) {
            log(`type an invalid word on A (${i + 1}/${max})`);
            await domA.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });

            log(`submit the word on A (${i + 1}/${max})`);
            await domA.submitButton.click();

            log(`make sure the main hearts display for PlayerA decreases by one (${i + 1}/${max})`);
            await expect(domA.thisPlayerHeartDisplay.locator("span")).toHaveCount(5 - (i + 1), {
                timeout: TIMEOUT,
            });
        }

        log("type an invalid word on A (5/5) to end the game");
        await domA.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
        await domA.submitButton.click();

        log("expect Player2 to win on both clients");
        await expectWinner(domA.page, "Player2");
        await expectWinner(domB.page, "Player2");
    } catch (err) {
        log(`TEST ERROR: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
    } finally {
        await testCleanUp(contexts, clientLogs, request, log);
    }
});

test(roomFlowTestNames.endGameWith3Players, async ({ browser, request }, testInfo) => {
    if (envGet("CUSTOM_PLAYWRIGHT_RUNNER") !== "true") test.skip();
    assertEnvVarEquals(
        { MOCK_GET_RANDOM_WORD: "true", MOCK_LOOKUP_WORD: "true", MOCK_WORD_VALIDATION_FAIL: "true" },
        testInfo.title
    );

    const TIMEOUT = E2E_TIMEOUT;
    const { pages, contexts, clientLogs, log, dom } = await setupPages(browser, 3);
    const [domA, domB, domC] = dom;

    try {
        await navigateToGameStart(pages, dom, log);
        const currentMatchLetter = await domA.matchLetterDisplay.textContent({ timeout: TIMEOUT });
        if (!currentMatchLetter) throw new E2ETestAssertionError("Match letter display for pageA did not resolve");

        for (let i = 0, max = 5; i < max; i++) {
            log(`type an invalid word on A (${i + 1}/${max})`);
            await domA.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
            log(`submit the word on A (${i + 1}/${max})`);
            await domA.submitButton.click();
            await pause(0.5);
        }

        log("expect Player1 to be out and Player2 to have the turn");
        await expect(domA.wordInput).toBeDisabled({ timeout: TIMEOUT });
        await expect(domB.wordInput).toBeEnabled({ timeout: TIMEOUT });

        for (let i = 0, max = 5; i < max; i++) {
            log(`type an invalid word on B (${i + 1}/${max})`);
            await domB.wordInput.fill(currentMatchLetter, { timeout: TIMEOUT });
            log(`submit the word on B (${i + 1}/${max})`);
            await domB.submitButton.click();
            await pause(0.5);
        }

        log("expect Player3 to win on all clients");
        await expectWinner(domA.page, "Player3");
        await expectWinner(domB.page, "Player3");
        await expectWinner(domC.page, "Player3");
    } catch (err) {
        log(`TEST ERROR: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
    } finally {
        await testCleanUp(contexts, clientLogs, request, log);
    }
});
