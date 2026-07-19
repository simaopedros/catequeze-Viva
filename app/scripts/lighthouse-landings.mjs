#!/usr/bin/env node
/**
 * Lighthouse smoke for public landings with enforceable budgets.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 npm run lighthouse:landings
 *   LIGHTHOUSE_STRICT=1 BASE_URL=https://homolog.catechis.app npm run lighthouse:landings
 *
 * Env:
 *   BASE_URL — target origin (default http://localhost:3000)
 *   LIGHTHOUSE_STRICT — if "1", fail on budget violations (default: fail only if LH crashes)
 *   LIGHTHOUSE_PERF_MIN — min performance score 0–100 (default 85)
 *   LIGHTHOUSE_LCP_MAX_MS — max LCP ms (default 2500)
 *   LIGHTHOUSE_FCP_MAX_MS — max FCP ms (default 1800)
 *   LIGHTHOUSE_TBT_MAX_MS — max TBT ms (default 200)
 *   LIGHTHOUSE_CLS_MAX — max CLS (default 0.1)
 *   LIGHTHOUSE_RUNS — runs per path, median used (default 1; use 3 for release)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const base = (process.env.BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const outDir = path.join(root, "artifacts", "lighthouse");
const paths = ["/", "/ia", "/presenca", "/sistema"];
const runs = Math.max(1, Number(process.env.LIGHTHOUSE_RUNS || "1") || 1);
const strict =
  process.env.LIGHTHOUSE_STRICT === "1" ||
  process.env.LIGHTHOUSE_STRICT === "true";

const BUDGETS = {
  performance: Number(process.env.LIGHTHOUSE_PERF_MIN || "85"),
  lcpMs: Number(process.env.LIGHTHOUSE_LCP_MAX_MS || "2500"),
  fcpMs: Number(process.env.LIGHTHOUSE_FCP_MAX_MS || "1800"),
  tbtMs: Number(process.env.LIGHTHOUSE_TBT_MAX_MS || "200"),
  cls: Number(process.env.LIGHTHOUSE_CLS_MAX || "0.1"),
};

fs.mkdirSync(outDir, { recursive: true });

const summary = [];

for (const p of paths) {
  const url = `${base}${p === "/" ? "/" : p}`;
  const safe = p === "/" ? "home" : p.replace(/^\//, "");
  const runRows = [];

  for (let r = 1; r <= runs; r++) {
    console.log(`\n→ Lighthouse ${url} (run ${r}/${runs})`);
    const outBase = path.join(outDir, runs > 1 ? `${safe}-r${r}` : safe);
    const args = [
      "lighthouse",
      url,
      "--only-categories=performance,accessibility,best-practices,seo",
      "--form-factor=mobile",
      "--screenEmulation.mobile",
      "--throttling-method=simulate",
      "--output=json,html",
      `--output-path=${outBase}`,
      "--chrome-flags=--headless --no-sandbox --disable-gpu",
      "--quiet",
    ];

    const result = spawnSync("npx", ["--yes", ...args], {
      cwd: root,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });

    if (result.status !== 0) {
      console.error(result.stderr || result.stdout);
      runRows.push({ path: p, error: "lighthouse failed", status: result.status });
      continue;
    }

    const candidates = [
      `${outBase}.report.json`,
      `${outBase}.json`,
      path.join(outDir, `${safe}.report.json`),
      path.join(outDir, `${safe}.json`),
    ];
    let reportPath = candidates.find((c) => fs.existsSync(c));
    if (!reportPath) {
      const jsons = fs
        .readdirSync(outDir)
        .filter((f) => f.endsWith(".json") && f.includes(safe))
        .map((f) => ({ f, t: fs.statSync(path.join(outDir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
      reportPath = jsons[0] ? path.join(outDir, jsons[0].f) : null;
    }

    if (!reportPath) {
      runRows.push({ path: p, error: "no report json" });
      continue;
    }

    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const cats = report.categories || {};
    const audits = report.audits || {};
    const row = {
      path: p,
      performance: score(cats.performance),
      accessibility: score(cats.accessibility),
      bestPractices: score(cats["best-practices"]),
      seo: score(cats.seo),
      lcpMs: ms(audits["largest-contentful-paint"]),
      fcpMs: ms(audits["first-contentful-paint"]),
      tbtMs: ms(audits["total-blocking-time"]),
      cls: num(audits["cumulative-layout-shift"]),
      report: path.relative(root, reportPath),
    };
    runRows.push(row);
    console.log(
      `  perf=${row.performance} FCP=${row.fcpMs}ms LCP=${row.lcpMs}ms TBT=${row.tbtMs}ms CLS=${row.cls}`,
    );
  }

  const okRuns = runRows.filter((r) => !r.error);
  if (okRuns.length === 0) {
    summary.push(runRows[0] || { path: p, error: "no successful runs" });
    continue;
  }

  // Median across runs for noisy metrics
  const med = (key) => median(okRuns.map((r) => r[key]).filter((v) => v != null));
  const baseRow = okRuns[Math.floor(okRuns.length / 2)];
  summary.push({
    path: p,
    performance: med("performance"),
    accessibility: med("accessibility"),
    bestPractices: med("bestPractices"),
    seo: med("seo"),
    lcpMs: med("lcpMs"),
    fcpMs: med("fcpMs"),
    tbtMs: med("tbtMs"),
    cls: med("cls"),
    runs: okRuns.length,
    report: baseRow.report,
  });
}

const summaryPath = path.join(outDir, "summary.json");
fs.writeFileSync(summaryPath, JSON.stringify({ budgets: BUDGETS, results: summary }, null, 2));
console.log(`\nSummary → ${summaryPath}`);
console.log("Budgets:", BUDGETS);

const budgetFailures = [];
for (const r of summary) {
  if (r.error) {
    budgetFailures.push({ path: r.path, reason: r.error });
    continue;
  }
  if (r.performance != null && r.performance < BUDGETS.performance) {
    budgetFailures.push({
      path: r.path,
      reason: `performance ${r.performance} < ${BUDGETS.performance}`,
    });
  }
  if (r.lcpMs != null && r.lcpMs > BUDGETS.lcpMs) {
    budgetFailures.push({
      path: r.path,
      reason: `LCP ${r.lcpMs}ms > ${BUDGETS.lcpMs}ms`,
    });
  }
  if (r.fcpMs != null && r.fcpMs > BUDGETS.fcpMs) {
    budgetFailures.push({
      path: r.path,
      reason: `FCP ${r.fcpMs}ms > ${BUDGETS.fcpMs}ms`,
    });
  }
  if (r.tbtMs != null && r.tbtMs > BUDGETS.tbtMs) {
    budgetFailures.push({
      path: r.path,
      reason: `TBT ${r.tbtMs}ms > ${BUDGETS.tbtMs}ms`,
    });
  }
  if (r.cls != null && r.cls > BUDGETS.cls) {
    budgetFailures.push({
      path: r.path,
      reason: `CLS ${r.cls} > ${BUDGETS.cls}`,
    });
  }
}

if (budgetFailures.length) {
  console.log("\nBudget check:");
  for (const f of budgetFailures) {
    console.log(`  ✗ ${f.path}: ${f.reason}`);
  }
} else {
  console.log("\nBudget check: all paths within targets (or metrics missing).");
}

const hardFail =
  summary.some((r) => r.error) || (strict && budgetFailures.length > 0);
process.exit(hardFail ? 1 : 0);

function score(cat) {
  if (!cat || cat.score == null) return null;
  return Math.round(cat.score * 100);
}
function ms(audit) {
  if (!audit || audit.numericValue == null) return null;
  return Math.round(audit.numericValue);
}
function num(audit) {
  if (!audit || audit.numericValue == null) return null;
  return Number(audit.numericValue.toFixed(3));
}
function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
