/**
 * Server logging: in-memory buffer + console, with its own global lifecycle.
 * Initialized early at startup; independent of socket context.
 */

export type LogEntry = { ts: number; msg: string };

const MAX_LOGS = 500;
let logs: LogEntry[] = [];
let initialized = false;

/** Initialize the logging subsystem. Call early in server startup. */
export function initLogging(): void {
    if (initialized) return;
    logs = [];
    initialized = true;
}

/** Log a message to the in-memory buffer and console. */
export function log(...messages: unknown[]): (...args: unknown[]) => void {
    const msg = `[server] ${messages.map(String).join(" ")}`;
    const entry: LogEntry = { ts: Date.now(), msg };
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();
    return console.log.bind(console, new Date(entry.ts).toISOString(), entry.msg);
}

/** Get the current log buffer (for test endpoints). */
export function getLogs(): LogEntry[] {
    return logs;
}
