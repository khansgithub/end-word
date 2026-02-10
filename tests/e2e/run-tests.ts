import { spawn } from "node:child_process";
import { roomFlowTestNames, type RoomFlowTestName } from "./test-names";

function runTest(testName: RoomFlowTestName, envVars: Partial<typeof process.env>, enableUi: boolean) {
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


const testName: RoomFlowTestName = roomFlowTestNames.playerHealthDecreases;
const envVars: Partial<typeof process.env> = {
    MOCK_WORD_VALIDATION: "true",
    MOCK_WORD_VALIDATION_FAIL: "true",
};
const enableUi = true;
runTest(testName, envVars, enableUi);