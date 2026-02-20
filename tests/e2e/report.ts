import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

export type TestResult = {
    name: string;
    status: string;
    duration: number;
    error?: { message: string; stack?: string };
};

/** Build a Playwright JSON reporter–compatible report from collected results. */
export function buildPlaywrightJsonReport(
    results: TestResult[],
    startTime: string,
    totalDuration: number
): object {
    const passed = results.filter((r) => r.status === "passed");
    const failed = results.filter((r) => r.status !== "passed" && r.status !== "skipped");
    const skipped = results.filter((r) => r.status === "skipped");

    const specs = results.map((r) => {
        const ok = r.status === "passed";
        const testStatus =
            r.status === "passed"
                ? "expected"
                : r.status === "skipped"
                  ? "skipped"
                  : "unexpected";
        const resultStatus = r.status === "skipped" ? "skipped" : r.status === "passed" ? "passed" : "failed";

        const result: Record<string, unknown> = {
            workerIndex: 0,
            parallelIndex: 0,
            status: resultStatus,
            duration: r.duration,
            errors: r.error ? [{ message: r.error.message }] : [],
            stdout: [],
            stderr: [],
            retry: 0,
            startTime,
            annotations: [],
            attachments: [],
        };
        if (r.error) {
            result.error = { message: r.error.message, stack: r.error.stack };
        }

        return {
            title: r.name,
            ok,
            tags: [],
            tests: [
                {
                    timeout: 120000,
                    annotations: [],
                    expectedStatus: "passed",
                    projectId: "",
                    projectName: "",
                    results: [result],
                    status: testStatus,
                },
            ],
            id: `custom-runner-${r.name}`,
            file: "room-flow.spec.ts",
            line: 0,
            column: 0,
        };
    });

    return {
        config: {
            configFile: resolve(process.cwd(), "playwright.config.ts"),
            rootDir: resolve(process.cwd(), "tests/e2e"),
            reporter: [["json"]],
        },
        suites: [
            {
                title: "room-flow.spec.ts",
                file: "room-flow.spec.ts",
                column: 0,
                line: 0,
                specs,
            },
        ],
        errors: [],
        stats: {
            startTime,
            duration: totalDuration,
            expected: passed.length,
            skipped: skipped.length,
            unexpected: failed.length,
            flaky: 0,
        },
    };
}

/** Write a report object to the given path. Creates parent directories if needed. */
export function writeReport(path: string, report: object): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(report, null, 2), "utf-8");
}

/** Parse --report="path" from argv. Returns the path or undefined if not passed. */
export function parseReportPath(): string | undefined {
    const arg = process.argv.find((a) => a.startsWith("--report="));
    if (!arg) return undefined;
    const value = arg.slice("--report=".length);
    return value.replace(/^["']|["']$/g, ""); // strip surrounding quotes
}
