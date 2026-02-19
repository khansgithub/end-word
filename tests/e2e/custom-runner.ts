import { roomFlowTestNames, type RoomFlowTestName } from "./test-names";
import { writeMockData, o, x } from "@/mocks/mock-dictionary-data";

// Playwright internal APIs - not officially documented, may change between versions
import { runAllTestsWithConfig } from "playwright/lib/runner/testRunner";
import { loadConfigFromFile } from "playwright/lib/common/configLoader";

type RunTestConfig = {
    testName: RoomFlowTestName;
    envVars: Partial<typeof process.env>;
    enableUi?: boolean;
    cb?: (...args: unknown[]) => void;
};

async function runTest({ testName, envVars, enableUi, cb }: RunTestConfig): Promise<string> {
    if (enableUi) {
        throw new Error("UI mode is not supported with in-process runner. Use spawn-based runner for --ui.");
    }

    if (cb) cb();

    // Set env vars in current process (workers inherit process.env)
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

const testConfigs = {
    [roomFlowTestNames.playerHealthDecreases]: {
        testName: roomFlowTestNames.playerHealthDecreases,
        envVars: {
            MOCK_GET_RANDOM_WORD: "true",
            MOCK_LOOKUP_WORD: "true",
            MOCK_WORD_VALIDATION_FAIL: "true",
        },
    },
    [roomFlowTestNames.playerDiesIn3PlayerGame]: {
        testName: roomFlowTestNames.playerDiesIn3PlayerGame,
        envVars: {
            MOCK_GET_RANDOM_WORD: "true",
            MOCK_LOOKUP_WORD: "true",
            MOCK_WORD_VALIDATION_FAIL: "false",
            MOCK_DICTIONARY_DATA: "true",
        },
        enableUi: true,
        cb: setupMockDictionaryData,
    }
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
            const status = await runTest({ ...testConfig, enableUi: false });
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

main();
