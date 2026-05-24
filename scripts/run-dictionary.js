const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dictionaryDir = path.join(__dirname, "..", "dictionary");
const python =
  process.platform === "win32"
    ? path.join(dictionaryDir, ".venv", "Scripts", "python.exe")
    : path.join(dictionaryDir, ".venv", "bin", "python");

if (!fs.existsSync(python)) {
  console.error(`Python venv not found at ${python}`);
  console.error("Create it with: python -m venv dictionary/.venv");
  process.exit(1);
}

const result = spawnSync(python, ["main.py"], {
  cwd: dictionaryDir,
  stdio: "inherit",
  env: {
    ...process.env,
    PYTHONUTF8: "1",
    PYTHONIOENCODING: "utf-8",
  },
});

process.exit(result.status ?? 1);
