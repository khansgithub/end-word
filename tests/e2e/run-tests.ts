import { spawn } from "node:child_process";
import { roomFlowTestNames, type RoomFlowTestName } from "./test-names";

const defaultTest: RoomFlowTestName = roomFlowTestNames.dualBrowserJoin;
const requested: RoomFlowTestName | undefined = process.argv[2] as RoomFlowTestName | undefined;
let testName = requested ?? defaultTest;

testName = roomFlowTestNames.dualBrowserJoin;

const args = ["playwright", "test", "tests/e2e/room-flow.spec.ts", "-g", testName];
const child = spawn("npx", args, { stdio: "inherit", shell: process.platform === "win32" });

child.on("exit", (code) => {
    process.exit(code ?? 1);
});
