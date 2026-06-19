"use client";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  ts: number;
  level: LogLevel;
  component: string;
  msg: string;
  data?: unknown;
};

const MAX_LOGS = 1000;
const logs: LogEntry[] = [];
let enabled = true;

export function setLoggingEnabled(v: boolean): void {
  enabled = v;
}

export function clearLogs(): void {
  logs.length = 0;
}

export function getLogs(): LogEntry[] {
  return [...logs];
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
