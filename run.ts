import { spawn } from "child_process";
import { platform } from "os";
import path from "path";

// Top-level constants
const dictDir = path.resolve(__dirname, "dictionary"); // adjust "dictionary" path if necessary
const dictEntryFile = "main.py"

function getActivationCommand(dictDir: string) {
    // relative path: dictionary\.venv\Scripts\activate.bat
    if (platform() === "win32") {
        return `"${path.join(dictDir, ".venv", "Scripts", "activate.bat")}"`;
    } else {
        return `. "${path.join(dictDir, ".venv", "bin", "activate")}"`;
    }
}

function getPythonCommand(dictDir: string, filename: string = "main.py"): string {
    const isWindows = platform() === "win32";
    const activationCmd = getActivationCommand(dictDir);
    return isWindows
        ? `cd /d "${dictDir}" && ${activationCmd} && python ${filename}`
        : `cd "${dictDir}" && ${activationCmd} && python ${filename}`;
}

function startDictionaryServer() {
    const pythonCmd = getPythonCommand(dictDir, dictEntryFile);

    // Execute in a shell so that activation/source works
    console.log(`[run.ts] Starting Dictionary Server (background): ${pythonCmd}`);
    const child = spawn(pythonCmd, {
        stdio: "inherit",
        shell: true,
        cwd: dictDir,
    });

    child.on("error", (err) => {
        console.error("Failed to spawn dictionary python main:", err);
    });

    // Kill Python when parent Node process exits
    const killChild = () => {
        if (child.killed) return;
        child.kill("SIGTERM");
    };
    process.on("exit", killChild);
    process.on("SIGINT", () => { killChild(); process.exit(); });
    process.on("SIGTERM", () => { killChild(); process.exit(); });
}

function startNpmServer() {
    const env = "npx cross-env NODE_ENV=production";
    const command = `${env} npm run start`;
    try {
        console.log(`[run.ts] Starting ${command} from project root`);
        require("child_process").execSync(command, { stdio: "inherit" });
    } catch (err) {
        console.error(`Failed to start ${command}:`, err);
    }
}

function main() {
    startDictionaryServer();
    startNpmServer();
}

main();