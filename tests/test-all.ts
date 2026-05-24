import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import dashboard from "@scripts/build-test-dashboard";

const outDir = "test-results";
const paths = {
    playwright: join(outDir, "playwright"),
    vitest: join(outDir, "vitest"),
};

const reportPath = (folder: keyof typeof paths, file: string) => join(paths[folder], file);

// Only create the directories if they don't already exist
[paths.playwright, paths.vitest].forEach(dir => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

const errors: { test: string; error: unknown }[] = [];

const steps: { test: string, command: string }[] = [
    {
        test: "Playwright main tests",
        command: `cross-env SUPPRESS=true MOCK_GET_RANDOM_WORD=true MOCK_LOOKUP_WORD=true MOCK_WORD_VALIDATION_FAIL=false npx playwright test`
    },
    {
        test: "Running E2E custom runner...",
        command: `npx tsx tests/e2e/custom-runner.ts --report="${reportPath("playwright", "custom-runner.json")}"`
    },
    {
        test: "Running Vitest unit tests...",
        command: `npx vitest --run --reporter=json --outputFile="${reportPath("vitest", "unittest.json")}"`
    }
];

function runTests(){
    for (const test of steps) {
        console.log(`Running: ${test.test}`);
        console.log(`Command: ${test.command}`);
        try {
            execSync(test.command, { stdio: "inherit" });
        } catch (err) {
            errors.push({ test: test.test, error: err });
            process.exitCode = 1; // Mark as failed, but continue to next step
        }
    }
    
    if (errors.length > 0) {
        console.error("\n========================================");
        console.error("Test run finished with errors:");
        for (const { test, error } of errors) {
            console.error(`- Error in "${test}":`, error);
        }
        console.error("========================================\n");
    }
}

function buildDashboard(){
    dashboard();
    const dashboardPath = join(outDir, "dashboard.html");
    console.log(`\nDashboard path: ${dashboardPath}`);
    console.log(`Open your dashboard:\nfile://${require("path").resolve(dashboardPath).replace(/\\/g, '/')}\n`);
}

runTests();
buildDashboard();