import { spawn } from "child_process";
import { roomFlowTestNames as t, type RoomFlowTestName } from "./test-names";
import { writeMockData, o, x } from "@/mocks/mock-dictionary-data";
import {
    buildPlaywrightJsonReport,
    parseReportPath,
    type TestResult,
    writeReport,
} from "./report";

/**
 * Custom Playwright Test Runner
 *
 * Run with: `tsx tests/e2e/custom-runner.ts [--report=path/to/report.json]`
 * Supports per-test env overrides and custom report output.
 */


type RunTestConfig = {
    envVars: Partial<typeof process.env>;
    enableUi?: boolean;
    cb?: (...args: unknown[]) => void;
};

/** Spawn-based runner: runs Playwright in a subprocess. Supports --ui. */
function runTestSpawn(testName: RoomFlowTestName, { envVars, enableUi, cb }: RunTestConfig) {
    const envVarsString = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join(" ");
    const env = `cross-env CUSTOM_PLAYWRIGHT_RUNNER=true RUN_ROOM_FLOW=1 ${envVarsString}`;
    const args = [
        env,
        "playwright test tests/e2e/room-flow.spec.ts",
        "-g",
        "--quiet",
        testName,
        enableUi ? "--ui" : ""
    ];
    if (cb) cb();
    const command = `npx ${args.join(" ")}`;
    console.log("Running test: ", testName);
    console.log("Environment variables: ", envVars);
    console.log("Command: ", command);

    const child = spawn(command, { stdio: "inherit", shell: process.platform === "win32" });

    child.on("exit", (code) => {
        process.exit(code ?? 1);
    });
}

/** Runs legacy `room-flow.spec.ts` in a subprocess (expects `npm run dev:legacy` on port 4000). */
async function runTestInProcess(
    testName: RoomFlowTestName,
    { envVars, cb }: RunTestConfig
): Promise<{ status: string; duration: number; error?: { message: string; stack?: string } }> {
    if (cb) cb();

    const mergedEnv: NodeJS.ProcessEnv = {
        ...process.env,
        CUSTOM_PLAYWRIGHT_RUNNER: "true",
        RUN_ROOM_FLOW: "1",
    };
    for (const [key, value] of Object.entries(envVars)) {
        if (value !== undefined) mergedEnv[key] = String(value);
    }

    console.log("Running test: ", testName);
    console.log("Environment variables: ", envVars);

    const start = performance.now();

    return await new Promise((resolve) => {
        const child = spawn(
            "npx",
            ["playwright", "test", "tests/e2e/room-flow.spec.ts", "-g", testName, "--quiet"],
            {
                stdio: "inherit",
                cwd: process.cwd(),
                env: mergedEnv,
                shell: process.platform === "win32",
            }
        );

        child.on("error", (err) => {
            resolve({
                status: "failed",
                duration: performance.now() - start,
                error: { message: err.message, stack: err.stack },
            });
        });

        child.on("exit", (code) => {
            const duration = performance.now() - start;
            if (code === 0) {
                resolve({ status: "passed", duration });
            } else {
                resolve({
                    status: "failed",
                    duration,
                    error: { message: `playwright exited with code ${code}` },
                });
            }
        });
    });
}

async function runTest(
    testName: RoomFlowTestName,
    config: RunTestConfig
): Promise<{ status: string; duration: number; error?: { message: string; stack?: string } }> {
    return runTestInProcess(testName, config);
}

const testConfigs: Partial<Record<RoomFlowTestName, RunTestConfig>> = {
    [t.playerHealthDecreases]: {
        envVars: {
            MOCK_GET_RANDOM_WORD: "true",
            MOCK_LOOKUP_WORD: "true",
            MOCK_WORD_VALIDATION_FAIL: "true",
        },
    },
    [t.playerDiesIn3PlayerGame]: {
        envVars: {
            MOCK_GET_RANDOM_WORD: "true",
            MOCK_LOOKUP_WORD: "true",
            MOCK_WORD_VALIDATION_FAIL: "false",
            MOCK_DICTIONARY_DATA: "true",
        },
        enableUi: true,
        cb: setupMockDictionaryData,
    },
    [t.endGameWith2Players]: {
        envVars: {
            MOCK_GET_RANDOM_WORD: "true",
            MOCK_LOOKUP_WORD: "true",
            MOCK_WORD_VALIDATION_FAIL: "true",
        },
        enableUi: true,
    },
    [t.endGameWith3Players]: {
        envVars: {
            MOCK_GET_RANDOM_WORD: "true",
            MOCK_LOOKUP_WORD: "true",
            MOCK_WORD_VALIDATION_FAIL: "true",
        },
        enableUi: true,
    },
};

function setupMockDictionaryData() {
    writeMockData([
        o,
        x, x, x, x, x,
        o, o, o,
    ]);
}

async function main() {
    const results: TestResult[] = [];
    const startTime = new Date().toISOString();
    const runStart = performance.now();

    for (const [testName, testConfig] of Object.entries(testConfigs)) {
        try {
            const { status, duration, error } = await runTest(testName as RoomFlowTestName, {
                ...testConfig,
                enableUi: false,
            });
            results.push({ name: testName, status, duration, error });
        } catch (err) {
            console.error(`[Error] ${testName}:`, err);
            const duration = 0;
            const error =
                err instanceof Error
                    ? { message: err.message, stack: err.stack }
                    : undefined;
            results.push({ name: testName, status: "failed", duration, error });
        }
    }

    const totalDuration = performance.now() - runStart;

    // Write Playwright-compatible JSON report only when --report="path" is passed
    const reportPath = parseReportPath();
    if (reportPath) {
        const report = buildPlaywrightJsonReport(results, startTime, totalDuration);
        writeReport(reportPath, report);
        console.log(`\nJSON report written to ${reportPath}`);
    }

    // Summary
    console.log("\n--- Summary ---");
    const passed = results.filter((r) => r.status === "passed");
    const failed = results.filter((r) => r.status !== "passed" && r.status !== "skipped");
    for (const { name, status, duration } of results) {
        const icon = status === "passed" ? "✓" : "✗";
        console.log(`  ${icon} ${name}: ${status} (${Math.round(duration)}ms)`);
    }
    console.log(`\n${passed.length} passed, ${failed.length} failed`);

    process.exit(failed.length > 0 ? 1 : 0);
}

// ((testName) => runTestSpawn(testName, testConfigs[testName]!))(t.endGameWith3Players)

main();