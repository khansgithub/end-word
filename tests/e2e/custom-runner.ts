import { spawn } from "child_process";
import { roomFlowTestNames as t, type RoomFlowTestName } from "./test-names";
import { writeMockData, o, x } from "@/mocks/mock-dictionary-data";

// Playwright internal APIs - not officially documented, may change between versions
import { runAllTestsWithConfig } from "playwright/lib/runner/testRunner";
import { loadConfigFromFile } from "playwright/lib/common/configLoader";

type RunTestConfig = {
    envVars: Partial<typeof process.env>;
    enableUi?: boolean;
    cb?: (...args: unknown[]) => void;
};

/** Spawn-based runner: runs Playwright in a subprocess. Supports --ui. */
function runTestSpawn(testName: RoomFlowTestName, {envVars, enableUi, cb }: RunTestConfig) {
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
): Promise<string> {
    if (cb) cb();

    process.env.CUSTOM_PLAYWRIGHT_RUNNER = "true";
    for (const [key, value] of Object.entries(envVars)) {
        if (value !== undefined) process.env[key] = String(value);
    }

    console.log("Running test: ", testName);
    console.log("Environment variables: ", envVars);

    const config = await loadConfigFromFile(undefined, {
        quiet: true,
        reporter: [["dot"]],
    });
    config.cliArgs = ["tests/e2e/room-flow.spec.ts"];
    config.cliGrep = testName;

    const status = await runAllTestsWithConfig(config);
    return status;
}

async function runTest(testName: RoomFlowTestName, config: RunTestConfig): Promise<string> {
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
    const results: { name: string; status: string }[] = [];

    for (const [testName, testConfig] of Object.entries(testConfigs)) {
        try {
            const status = await runTest(testName as RoomFlowTestName, { ...testConfig, enableUi: false });
            results.push({ name: testName, status });
        } catch (err) {
            console.error(`[Error] ${testName}:`, err);
            results.push({ name: testName, status: "error" });
        }
    }

    // Summary
    console.log("\n--- Summary ---");
    const passed = results.filter((r) => r.status === "passed");
    const failed = results.filter((r) => r.status !== "passed");
    for (const { name, status } of results) {
        const icon = status === "passed" ? "✓" : "✗";
        console.log(`  ${icon} ${name}: ${status}`);
    }
    console.log(`\n${passed.length} passed, ${failed.length} failed`);

    process.exit(failed.length > 0 ? 1 : 0);
}

// ((testName) => runTestSpawn(testName, testConfigs[testName]!))(t.endGameWith3Players)

main();