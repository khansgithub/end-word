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

    // Collect server logs.
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
});
