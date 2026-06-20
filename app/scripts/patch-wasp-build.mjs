#!/usr/bin/env node

/**
 * Post-wasp-build patch script.
 *
 * Two goals:
 * 1. PG_BOSS_NEW_OPTIONS: merge user-supplied JSON into the default options
 *    instead of replacing them wholesale — so you can pass just `{"max":2}`
 *    without duplicating `connectionString`.
 * 2. RUN_JOBS: when `RUN_JOBS !== "true"`, skip registering pg-boss workers
 *    and schedules. The process still starts pg-boss (so `boss.send()` works
 *    for producers), but does NOT consume jobs.
 *
 * Run after `wasp build` and before `npm run bundle` (or `tsc --build`).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const waspOut = resolve(__dirname, '..', '.wasp', 'out')

// ── File sets (TypeScript sources + pre-compiled JS dist) ──────────────────

const PGBOSS_TS = resolve(
  waspOut,
  'sdk/wasp/server/jobs/core/pgBoss/pgBoss.ts'
)
const PGBOSS_JS = resolve(
  waspOut,
  'sdk/wasp/dist/server/jobs/core/pgBoss/pgBoss.js'
)
const PGBOSSJOB_TS = resolve(
  waspOut,
  'sdk/wasp/server/jobs/core/pgBoss/pgBossJob.ts'
)
const PGBOSSJOB_JS = resolve(
  waspOut,
  'sdk/wasp/dist/server/jobs/core/pgBoss/pgBossJob.js'
)

// ── Patch 1: Merge PG_BOSS_NEW_OPTIONS instead of replacing ─────────────────

function patchPgBossOptions(content, filePath) {
  // BEFORE: pgBossNewOptions = JSON.parse(env.PG_BOSS_NEW_OPTIONS)
  // AFTER:  pgBossNewOptions = { ...pgBossNewOptions, ...JSON.parse(env.PG_BOSS_NEW_OPTIONS) }
  const replace = 'pgBossNewOptions = JSON.parse(env.PG_BOSS_NEW_OPTIONS)'
  const withMerge =
    'pgBossNewOptions = { ...pgBossNewOptions, ...JSON.parse(env.PG_BOSS_NEW_OPTIONS) }'

  if (!content.includes(replace)) {
    console.warn(`[patch] WARNING: merge target not found in ${filePath}`)
    return content
  }

  // Only replace the first occurrence (there should be exactly one)
  return content.replace(replace, withMerge)
}

// ── Patch 2: Guard registerJob with RUN_JOBS ───────────────────────────────

function patchRegisterJob(content, filePath) {
  // The registerJob function body starts with `pgBossStarted.then(`.
  // We prepend a guard that returns early when RUN_JOBS !== "true".

  const pattern = /(\bpgBossStarted\.then\s*\(\s*async\s*\(\s*boss\s*\)\s*=>\s*\{)/

  if (!pattern.test(content)) {
    console.warn(`[patch] WARNING: registerJob pattern not found in ${filePath}`)
    return content
  }

  return content.replace(
    pattern,
    `\n  // Only register workers/schedules when RUN_JOBS is set (worker mode).\n  // Skip when false/undefined so web/API processes act as producers only.\n  if (process.env.RUN_JOBS !== 'true') return\n  $1`
  )
}

// ── Apply patches ──────────────────────────────────────────────────────────

const filesToPatch = [
  { path: PGBOSS_TS, patch: patchPgBossOptions, label: 'pgBoss.ts (options merge)' },
  { path: PGBOSS_JS, patch: patchPgBossOptions, label: 'pgBoss.js (options merge)' },
  { path: PGBOSSJOB_TS, patch: patchRegisterJob, label: 'pgBossJob.ts (RUN_JOBS guard)' },
  { path: PGBOSSJOB_JS, patch: patchRegisterJob, label: 'pgBossJob.js (RUN_JOBS guard)' },
]

let changes = 0

for (const { path, patch, label } of filesToPatch) {
  try {
    const original = readFileSync(path, 'utf-8')
    const patched = patch(original, path)

    if (patched !== original) {
      writeFileSync(path, patched, 'utf-8')
      console.log(`[patch] ✓ ${label}`)
      changes++
    } else {
      console.log(`[patch] - ${label} (already patched or no match)`)
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`[patch] SKIP: file not found — ${path}`)
    } else {
      throw err
    }
  }
}

console.log(`\n[patch] Done. ${changes} file(s) modified.`)
