import { spawn } from "child_process";
import { roomFlowTestNames as t, type RoomFlowTestName } from "./test-names";
import { writeMockData, o, x } from "@/mocks/mock-dictionary-data";
import { envSet, envGet } from "../../src/server/env";
import {
    buildPlaywrightJsonReport,
    parseReportPath,
    type TestResult,
    writeReport,
} from "./report";
import playwrightConfig from "@/../playwright.config";
// Playwright internal APIs - not officially documented, may change between versions
import { runAllTestsWithConfig } from "playwright/lib/runner/testRunner";
import { loadConfigFromFile } from "playwright/lib/common/configLoader";

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
    const env = `cross-env CUSTOM_PLAYWRIGHT_RUNNER=true ${envVarsString}`;
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

/** In-process runner: uses Playwright internal APIs. Does not support --ui. */
async function runTestInProcess(
    testName: RoomFlowTestName,
    { envVars, cb }: RunTestConfig
): Promise<{ status: string; duration: number; error?: { message: string; stack?: string } }> {
    if (cb) cb();

    envSet("CUSTOM_PLAYWRIGHT_RUNNER", "true");
    for (const [key, value] of Object.entries(envVars)) {
        if (value !== undefined) envSet(key as keyof typeof process.env, String(value));
    }

    console.log("Running test: ", testName);
    console.log("Environment variables: ", envVars);

    const config = await loadConfigFromFile(undefined, {
        ...playwrightConfig,
        quiet: true,
        outputDir: `test-results/playwright/custom-runner/${testName}/`,
        reporter: [["json", {outputFile: `test-results/playwright/custom-runner/${testName}/out.json`}]],
    });
    config.cliArgs = ["tests/e2e/room-flow.spec.ts"];
    config.cliGrep = testName;

    const start = performance.now();
    try {
        const status = await runAllTestsWithConfig(config);
        const duration = performance.now() - start;
        return { status, duration };
    } catch (err) {
        const duration = performance.now() - start;
        const error =
            err instanceof Error
                ? { message: err.message, stack: err.stack }
                : { message: String(err) };
        return { status: "failed", duration, error };
    }
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