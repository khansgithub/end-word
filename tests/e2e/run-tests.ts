import { spawn } from "node:child_process";
import { roomFlowTestNames, type RoomFlowTestName } from "./test-names";

type runTestConfig = {
    testName: RoomFlowTestName,
    envVars: Partial<typeof process.env>,
    enableUi?: boolean
}

function runTest({ testName, envVars, enableUi }: runTestConfig) {
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
            MOCK_WORD_VALIDATION: "true",
            MOCK_WORD_VALIDATION_FAIL: "true",
        },
    },
    [roomFlowTestNames.playerDiesIn3PlayerGame]: {
        testName: roomFlowTestNames.playerDiesIn3PlayerGame,
        envVars: {
            MOCK_WORD_VALIDATION: "true",
            MOCK_WORD_VALIDATION_FAIL: "false",
        },
        enableUi: true
    }
};


runTest(testConfigs[roomFlowTestNames.playerDiesIn3PlayerGame]);
