import { spawn } from "node:child_process";
import { roomFlowTestNames, type RoomFlowTestName } from "./test-names";
import { writeMockData, o, x } from "@/mocks/mock-dictionary-data";

type runTestConfig = {
    testName: RoomFlowTestName,
    envVars: Partial<typeof process.env>,
    enableUi?: boolean,
    cb?: (...args: any[]) => void
}

function runTest({ testName, envVars, enableUi, cb }: runTestConfig) {
    // const defaultTest: RoomFlowTestName = roomFlowTestNames.dualBrowserJoin;
    // const requested: RoomFlowTestName | undefined = process.argv[2] as RoomFlowTestName | undefined;
    // let testName = requested ?? defaultTest;

    const env = `cross-env ${Object.entries(envVars).map(([key, value]) => `${key}=${value}`).join(" ")}`;
    const args = [
        env,
        "playwright test tests/e2e/room-flow.spec.ts",
        "-g",
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
    writeMockData([o, x, x, x, x, x, x]);
}

runTest(testConfigs[roomFlowTestNames.playerDiesIn3PlayerGame]);
