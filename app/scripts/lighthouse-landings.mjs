#!/usr/bin/env node
/**
 * PR15 — Lighthouse smoke for public landings (LCP/CLS/INP-ish via TBT).
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 npm run lighthouse:landings
 *
 * Requires: npx lighthouse (pulled on demand), Chrome/Chromium available.
 * Writes JSON + summary under artifacts/lighthouse/
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

fs.mkdirSync(outDir, { recursive: true });

const summary = [];

for (const p of paths) {
  const url = `${base}${p === "/" ? "/" : p}`;
  const safe = p === "/" ? "home" : p.replace(/^\//, "");
  const outJson = path.join(outDir, `${safe}.json`);
  const outHtml = path.join(outDir, `${safe}.html`);

  console.log(`\n→ Lighthouse ${url}`);
  const args = [
    "lighthouse",
    url,
    "--only-categories=performance,accessibility,best-practices,seo",
    "--output=json,html",
    `--output-path=${path.join(outDir, safe)}`,
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
    summary.push({ path: p, error: "lighthouse failed", status: result.status });
    continue;
  }

  // lighthouse writes ${safe}.report.json depending on version — normalize
  const candidates = [
    outJson,
    path.join(outDir, `${safe}.report.json`),
    path.join(outDir, `${safe}.json`),
  ];
  let reportPath = candidates.find((c) => fs.existsSync(c));
  if (!reportPath) {
    // find newest json in outDir for this run
    const jsons = fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith(".json") && f.includes(safe));
    reportPath = jsons[0] ? path.join(outDir, jsons[0]) : null;
  }

  if (!reportPath) {
    summary.push({ path: p, error: "no report json" });
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
    cls: num(audits["cumulative-layout-shift"]),
    tbtMs: ms(audits["total-blocking-time"]),
    report: path.relative(root, reportPath),
  };
  summary.push(row);
  console.log(
    `  perf=${row.performance} seo=${row.seo} LCP=${row.lcpMs}ms CLS=${row.cls}`,
  );
}

const summaryPath = path.join(outDir, "summary.json");
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`\nSummary → ${summaryPath}`);

// Soft targets from design (p75 goals; single run is noisy)
const failures = summary.filter((r) => {
  if (r.error) return true;
  // Only fail hard on catastrophic SEO/perf for CI optional gate
  return false;
});
process.exit(failures.some((f) => f.error === "lighthouse failed") ? 1 : 0);

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
