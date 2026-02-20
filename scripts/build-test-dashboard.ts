#!/usr/bin/env npx tsx
/**
 * Parses test-results/ and builds an interactive HTML dashboard.
 * Run: npx tsx scripts/build-test-dashboard.ts
 * Output: test-results/dashboard.html
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const ROOT = join(process.cwd(), "test-results");
const PLAYWRIGHT_DIR = join(ROOT, "playwright");
const VITEST_DIR = join(ROOT, "vitest");
const CUSTOM_RUNNER_DIR = join(PLAYWRIGHT_DIR, "custom-runner");
const RUNNER_DIR = join(PLAYWRIGHT_DIR, "runner");

// --- Types ---

interface PlaywrightSpec {
  title: string;
  ok: boolean;
  tests: Array<{
    results: Array<{
      status: string;
      duration: number;
      errors: Array<{ message?: string }>;
      startTime?: string;
    }>;
  }>;
}

interface PlaywrightSuite {
  title: string;
  file: string;
  specs: PlaywrightSpec[];
}

interface PlaywrightReport {
  config?: { rootDir?: string };
  suites?: PlaywrightSuite[];
  stats?: {
    startTime?: string;
    duration?: number;
    expected?: number;
    skipped?: number;
    unexpected?: number;
    flaky?: number;
  };
}

interface LastRunJson {
  status: string;
  failedTests: string[];
}

interface VitestAssertion {
  fullName: string;
  title: string;
  status: string;
  duration?: number;
  failureMessages?: string[];
}

interface VitestTestFile {
  name: string;
  status: string;
  startTime: number;
  endTime: number;
  assertionResults: VitestAssertion[];
}

interface VitestReport {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  startTime: number;
  success: boolean;
  testResults: VitestTestFile[];
}

// --- Parsers ---

function safeReadJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parsePlaywrightCustomRunnerReport(): PlaywrightReport | null {
  const path = join(PLAYWRIGHT_DIR, "custom-runner.json");
  return safeReadJson<PlaywrightReport>(path);
}

function parsePlaywrightRunnerReport(): PlaywrightReport | null {
  const path = join(RUNNER_DIR, "out.json");
  return safeReadJson<PlaywrightReport>(path);
}

function parseLastRun(dir: string, testName?: string): LastRunJson | null {
  const path = testName ? join(dir, testName, ".last-run.json") : join(dir, ".last-run.json");
  return safeReadJson<LastRunJson>(path);
}

function parseVitestReport(): VitestReport | null {
  const path = join(VITEST_DIR, "unittest.json");
  return safeReadJson<VitestReport>(path);
}

function listCustomRunnerTests(): string[] {
  if (!existsSync(CUSTOM_RUNNER_DIR)) return [];
  try {
    const entries = readdirSync(CUSTOM_RUNNER_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

// --- Data aggregation ---

interface E2ETestInfo {
  name: string;
  status: "passed" | "failed" | "skipped" | "unknown";
  duration?: number;
  source: "playwright" | "last-run";
}

interface PlaywrightRunData {
  available: boolean;
  label: string;
  stats: { expected: number; skipped: number; unexpected: number; flaky: number; duration?: number; startTime?: string };
  specs: E2ETestInfo[];
  lastRun?: LastRunJson;
}

interface DashboardData {
  playwrightRunner: PlaywrightRunData;
  playwrightCustom: PlaywrightRunData;
  vitest: {
    available: boolean;
    stats: { total: number; passed: number; failed: number; success: boolean; startTime?: number };
    files: VitestTestFile[];
  };
}

function specsFromReport(report: PlaywrightReport | null): E2ETestInfo[] {
  const specs: E2ETestInfo[] = [];
  if (report?.suites) {
    for (const suite of report.suites) {
      for (const spec of suite.specs) {
        const result = spec.tests?.[0]?.results?.[0];
        const status = spec.ok ? "passed" : "failed";
        specs.push({
          name: spec.title,
          status: result?.status === "skipped" ? "skipped" : status,
          duration: result?.duration,
          source: "playwright",
        });
      }
    }
  }
  return specs;
}

function collectData(): DashboardData {
  const runnerReport = parsePlaywrightRunnerReport();
  const customReport = parsePlaywrightCustomRunnerReport();
  const vitestReport = parseVitestReport();
  const customTests = listCustomRunnerTests();

  const runnerLastRun = parseLastRun(RUNNER_DIR);
  const customLastRunMap: Record<string, LastRunJson> = {};
  for (const name of customTests) {
    const lr = parseLastRun(CUSTOM_RUNNER_DIR, name);
    if (lr) customLastRunMap[name] = lr;
  }

  const runnerSpecs = specsFromReport(runnerReport);
  const customSpecs: E2ETestInfo[] = [...specsFromReport(customReport)];

  // Merge custom-runner with last-run for tests not in aggregate report
  for (const name of customTests) {
    if (customSpecs.some((s) => s.name === name)) continue;
    const lr = customLastRunMap[name];
    customSpecs.push({
      name,
      status: (lr?.status as E2ETestInfo["status"]) ?? "unknown",
      source: "last-run",
    });
  }

  return {
    playwrightRunner: {
      available: !!runnerReport,
      label: "Main runner (playwright test)",
      stats: {
        expected: runnerReport?.stats?.expected ?? 0,
        skipped: runnerReport?.stats?.skipped ?? 0,
        unexpected: runnerReport?.stats?.unexpected ?? 0,
        flaky: runnerReport?.stats?.flaky ?? 0,
        duration: runnerReport?.stats?.duration,
        startTime: runnerReport?.stats?.startTime,
      },
      specs: runnerSpecs,
      lastRun: runnerLastRun ?? undefined,
    },
    playwrightCustom: {
      available: !!customReport || customSpecs.length > 0,
      label: "Custom runner (per-test)",
      stats: {
        expected: customReport?.stats?.expected ?? 0,
        skipped: customReport?.stats?.skipped ?? 0,
        unexpected: customReport?.stats?.unexpected ?? 0,
        flaky: customReport?.stats?.flaky ?? 0,
        duration: customReport?.stats?.duration,
        startTime: customReport?.stats?.startTime,
      },
      specs: customSpecs,
    },
    vitest: {
      available: !!vitestReport,
      stats: {
        total: vitestReport?.numTotalTests ?? 0,
        passed: vitestReport?.numPassedTests ?? 0,
        failed: vitestReport?.numFailedTests ?? 0,
        success: vitestReport?.success ?? false,
        startTime: vitestReport?.startTime,
      },
      files: vitestReport?.testResults ?? [],
    },
  };
}

// --- HTML generation ---

function formatDuration(ms?: number): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function buildE2ESection(pw: PlaywrightRunData, idPrefix: string): string {
  const hasData = pw.available || pw.specs.length > 0;
  if (!hasData) return "";

  return `
    <section>
      <h2><span class="badge e2e">E2E</span> ${pw.label}</h2>
      <div class="filter-bar">
        <button class="filter-btn active" data-filter="${idPrefix}" data-value="all">All</button>
        <button class="filter-btn" data-filter="${idPrefix}" data-value="passed">Passed</button>
        <button class="filter-btn" data-filter="${idPrefix}" data-value="failed">Failed</button>
        <button class="filter-btn" data-filter="${idPrefix}" data-value="skipped">Skipped</button>
      </div>
      <div class="test-list" id="${idPrefix}-list">
        ${pw.specs
          .map(
            (s) => `
        <div class="test-row" data-status="${s.status}" data-list="${idPrefix}">
          <span>${s.name}</span>
          <span class="duration">${formatDuration(s.duration)}</span>
          <span class="status">${s.status}</span>
        </div>`
          )
          .join("")}
      </div>
    </section>`;
}

function buildHtml(data: DashboardData): string {
  const runner = data.playwrightRunner;
  const custom = data.playwrightCustom;
  const vt = data.vitest;

  const runnerPassed = runner.stats.unexpected === 0 && (runner.stats.expected > 0 || runner.specs.length > 0);
  const customPassed = custom.stats.unexpected === 0 && (custom.stats.expected > 0 || custom.specs.length > 0);
  const vtAllPassed = vt.stats.success;

  const latestStart =
    runner.stats.startTime ??
    custom.stats.startTime ??
    (vt.stats.startTime ? new Date(vt.stats.startTime).toISOString() : null);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Test Results — end-word</title>
  <style>
    :root {
      --bg: #0f0f12;
      --surface: #1a1a1f;
      --surface-hover: #222228;
      --text: #e4e4e7;
      --text-muted: #a1a1aa;
      --accent: #6366f1;
      --accent-dim: #4f46e5;
      --pass: #22c55e;
      --fail: #ef4444;
      --skip: #f59e0b;
      --border: #27272a;
      --font-sans: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
    }
    main { max-width: 960px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      transition: background 0.15s;
    }
    .card:hover { background: var(--surface-hover); }
    .card .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .card .value { font-size: 1.5rem; font-weight: 600; margin-top: 0.25rem; display: block; }
    .card.pass .value { color: var(--pass); }
    .card.fail .value { color: var(--fail); }
    .card.neutral .value { color: var(--text); }
    section { margin-bottom: 2.5rem; }
    section h2 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .test-list {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .test-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background 0.15s;
    }
    .test-row:last-child { border-bottom: none; }
    .test-row:hover { background: var(--surface-hover); }
    .test-row[data-status="passed"] .status { color: var(--pass); }
    .test-row[data-status="failed"] .status { color: var(--fail); }
    .test-row[data-status="skipped"] .status { color: var(--skip); }
    .test-row[data-status="unknown"] .status { color: var(--text-muted); }
    .status { font-size: 0.75rem; text-transform: uppercase; font-weight: 600; }
    .duration { font-size: 0.8rem; color: var(--text-muted); }
    .empty { padding: 2rem; text-align: center; color: var(--text-muted); }
    .vitest-file {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      overflow: hidden;
    }
    .vitest-file-header {
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.15s;
    }
    .vitest-file-header:hover { background: var(--surface-hover); }
    .vitest-file[data-status="passed"] .vitest-file-header .status { color: var(--pass); }
    .vitest-file[data-status="failed"] .vitest-file-header .status { color: var(--fail); }
    .vitest-file-body { padding: 0 1rem 1rem; }
    .vitest-file-body.collapsed { display: none; }
    .assertion {
      font-size: 0.8rem;
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .assertion:last-child { border-bottom: none; }
    .assertion[data-status="passed"] .status { color: var(--pass); }
    .assertion[data-status="failed"] .status { color: var(--fail); }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    .badge.e2e { background: var(--accent-dim); color: white; }
    .badge.unit { background: #065f46; color: #6ee7b7; }
    .filter-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .filter-btn {
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 0.8rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }
    .filter-btn:hover { background: var(--surface-hover); }
    .filter-btn.active { background: var(--accent); border-color: var(--accent); color: white; }
  </style>
</head>
<body>
  <main>
    <h1>Test Results</h1>
    <p class="subtitle">end-word • ${new Date().toISOString()}</p>

    <div class="grid">
      <div class="card ${runnerPassed ? "pass" : runner.stats.unexpected > 0 ? "fail" : "neutral"}">
        <span class="label">E2E (Main)</span>
        <span class="value">${runner.stats.expected} passed${runner.stats.skipped > 0 ? `, ${runner.stats.skipped} skipped` : ""}${runner.stats.unexpected > 0 ? `, ${runner.stats.unexpected} failed` : ""}</span>
        ${runner.stats.duration != null ? `<span class="duration" style="margin-top:0.5rem;display:block">${formatDuration(runner.stats.duration)}</span>` : ""}
      </div>
      <div class="card ${customPassed ? "pass" : custom.stats.unexpected > 0 ? "fail" : "neutral"}">
        <span class="label">E2E (Custom)</span>
        <span class="value">${custom.stats.expected} passed${custom.stats.unexpected > 0 ? `, ${custom.stats.unexpected} failed` : ""}</span>
        ${custom.stats.duration != null ? `<span class="duration" style="margin-top:0.5rem;display:block">${formatDuration(custom.stats.duration)}</span>` : ""}
      </div>
      <div class="card ${vtAllPassed ? "pass" : vt.stats.failed > 0 ? "fail" : "neutral"}">
        <span class="label">Unit</span>
        <span class="value">${vt.stats.passed}/${vt.stats.total}</span>
        ${vt.stats.failed > 0 ? `<span class="duration" style="margin-top:0.5rem;display:block;color:var(--fail)">${vt.stats.failed} failed</span>` : ""}
      </div>
      <div class="card neutral">
        <span class="label">Last run</span>
        <span class="value">${latestStart ? formatTime(latestStart) : "—"}</span>
      </div>
    </div>

    ${buildE2ESection(runner, "runner")}
    ${buildE2ESection(custom, "custom")}
    ${!runner.available && runner.specs.length === 0 && !custom.available && custom.specs.length === 0 ? `
    <section>
      <h2><span class="badge e2e">E2E</span> Playwright</h2>
      <div class="empty">No results. Run <code>npm run test:playwright</code> or <code>npm run test:playwright:custom</code>.</div>
    </section>` : ""}

    <section>
      <h2><span class="badge unit">Unit</span> Vitest</h2>
      ${!vt.available ? '<div class="empty">No results. Run <code>npm run test:unit</code> with <code>--reporter=json --outputFile=test-results/vitest/unittest.json</code>.</div>' : `
      <div class="filter-bar">
        <button class="filter-btn active" data-filter-vitest="all">All</button>
        <button class="filter-btn" data-filter-vitest="passed">Passed</button>
        <button class="filter-btn" data-filter-vitest="failed">Failed</button>
      </div>
      <div id="vitest-list">
        ${vt.files
          .map(
            (f) => `
        <div class="vitest-file" data-status="${f.status}">
          <div class="vitest-file-header">
            <span>${f.name.split(/[/\\\\]/).pop() ?? f.name}</span>
            <span class="status">${f.status} (${f.assertionResults?.length ?? 0})</span>
          </div>
          <div class="vitest-file-body collapsed">
            ${(f.assertionResults ?? [])
              .map(
                (a) => `
            <div class="assertion" data-status="${a.status}">
              <span>${a.title}</span>
              <span class="duration">${a.duration != null ? formatDuration(a.duration) : ""}</span>
              <span class="status">${a.status}</span>
            </div>`
              )
              .join("")}
          </div>
        </div>`
          )
          .join("")}
      </div>
      `}
    </section>
  </main>

  <script>
    (function() {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var listId = this.dataset.filter;
          var value = this.dataset.value;
          this.parentElement.querySelectorAll('button').forEach(function(b) {
            b.classList.toggle('active', b.dataset.filter === listId && b.dataset.value === value);
          });
          var list = document.getElementById(listId + '-list');
          if (list) {
            list.querySelectorAll('.test-row').forEach(function(row) {
              row.style.display = (value === 'all' || row.dataset.status === value) ? '' : 'none';
            });
          }
        });
      });
      var vtBar = document.querySelector('#vitest-list');
      if (vtBar) {
        vtBar = vtBar.previousElementSibling;
        if (vtBar) {
          vtBar.querySelectorAll('button').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var value = this.dataset.filterVitest;
              vtBar.querySelectorAll('button').forEach(function(b) {
                b.classList.toggle('active', b.dataset.filterVitest === value);
              });
              document.querySelectorAll('#vitest-list .vitest-file').forEach(function(f) {
                f.style.display = (value === 'all' || f.dataset.status === value) ? '' : 'none';
              });
            });
          });
        }
      }
      document.querySelectorAll('.vitest-file-header').forEach(function(header) {
        header.addEventListener('click', function() {
          this.nextElementSibling.classList.toggle('collapsed');
        });
      });
    })();
  </script>
</body>
</html>`;
}

// --- Main ---

export default function main(): void {
  const data = collectData();
  const html = buildHtml(data);
  const outPath = join(ROOT, "dashboard.html");
  // Ensure the parent directory exists before writing the file

  const outDir = dirname(outPath);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  writeFileSync(outPath, html, "utf-8");
  console.log(`Dashboard written to ${outPath}`);
}

main();
