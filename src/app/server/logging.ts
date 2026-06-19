import fs from "fs";
import path from "path";
import os from "os";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  ts: number;
  level: LogLevel;
  component: string;
  msg: string;
  data?: unknown;
};

const MAX_LOGS = 1000;
const MAX_LOG_FILE_BYTES = 5 * 1024 * 1024;
const logs: LogEntry[] = [];
let enabled = process.env.NODE_ENV !== "production";
let logFilePath: string | null = null;
let fileStreamInitialized = false;

export function setLoggingEnabled(v: boolean): void {
  enabled = v;
}

export function clearLogs(): void {
  logs.length = 0;
}

export function getLogs(): LogEntry[] {
  return [...logs];
}

export function setLogFilePath(filePath: string): void {
  logFilePath = filePath;
  fileStreamInitialized = false;
}

const LEVEL_PAD: Record<LogLevel, string> = {
  debug: "DBG",
  info: "INF",
  warn: "WRN",
  error: "ERR",
};

function append(entry: LogEntry): void {
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
}

function formatLine(level: LogLevel, component: string, msg: string, data?: unknown): string {
  const iso = new Date().toISOString();
  const padded = LEVEL_PAD[level];
  const extra = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  return `[${iso}] [${padded}] [${component}] ${msg}${extra}${os.EOL}`;
}

function writeToFile(line: string): void {
  const fp = logFilePath ?? path.join(process.cwd(), "logs", "server.log");
  logFilePath = fp;

  if (!fileStreamInitialized) {
    try {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(fp) && fs.statSync(fp).size > MAX_LOG_FILE_BYTES) {
        const truncated = line;
        fs.writeFileSync(fp, truncated, "utf-8");
      }
    } catch {
      // swallow — can't log a logging failure
    }
    fileStreamInitialized = true;
  }

  try {
    fs.appendFileSync(fp, line, "utf-8");
  } catch {
    // swallow
  }
}

function formatLog(level: LogLevel, component: string, msg: string, data?: unknown): void {
  if (!enabled) return;
  const ts = Date.now();
  const entry: LogEntry = { ts, level, component, msg, data };
  append(entry);

  const prefix = `[${LEVEL_PAD[level]}] [${component}]`;
  const rest = data !== undefined ? `${msg} %o` : msg;

  switch (level) {
    case "error":
      console.error(prefix, rest, ...(data !== undefined ? [data] : []));
      break;
    case "warn":
      console.warn(prefix, rest, ...(data !== undefined ? [data] : []));
      break;
    case "debug":
      console.debug(prefix, rest, ...(data !== undefined ? [data] : []));
      break;
    default:
      console.log(prefix, rest, ...(data !== undefined ? [data] : []));
  }

  const line = formatLine(level, component, msg, data);
  writeToFile(line);
}

export const logger = {
  debug: (component: string, msg: string, data?: unknown) =>
    formatLog("debug", component, msg, data),
  info: (component: string, msg: string, data?: unknown) =>
    formatLog("info", component, msg, data),
  warn: (component: string, msg: string, data?: unknown) =>
    formatLog("warn", component, msg, data),
  error: (component: string, msg: string, data?: unknown) =>
    formatLog("error", component, msg, data),
};
