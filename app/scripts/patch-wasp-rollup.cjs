#!/usr/bin/env node
/**
 * Patch the Wasp CLI's generated server rollup config to inline dynamic imports.
 *
 * Wasp 0.22's server bundle template emits `output: { file, ... }` (single-file
 * output). The server code graph (app operations + the bundled `wasp` SDK) uses
 * internal `await import('...')` calls, which make Rollup 4.x emit multiple
 * chunks. Rollup then aborts with:
 *
 *   RollupError: Invalid value for option "output.file" - when building
 *   multiple chunks, the "output.dir" option must be used, not "output.file".
 *   To inline dynamic imports, set the "inlineDynamicImports" option.
 *
 * Each generated bundle has a single entry, so `inlineDynamicImports: true` is
 * valid and produces the single-file server bundle Wasp expects.
 *
 * This patches the CLI *template* so every `wasp compile` / `wasp start`
 * regenerates a working `.wasp/out/server/rollup.config.js`. It is idempotent
 * and also patches an already-generated project config when present.
 *
 * See: https://github.com/wasp-lang/wasp (rollup single-file server bundle).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NEEDLE = 'sourcemap: true,';
const INSERT = 'sourcemap: true,\n      inlineDynamicImports: true,';

function patchFile(file) {
  if (!fs.existsSync(file)) return false;
  const original = fs.readFileSync(file, 'utf8');
  if (original.includes('inlineDynamicImports')) {
    console.log(`[patch-wasp-rollup] already patched: ${file}`);
    return true;
  }
  if (!original.includes(NEEDLE)) {
    console.warn(`[patch-wasp-rollup] pattern not found, skipping: ${file}`);
    return false;
  }
  fs.writeFileSync(file, original.replace(NEEDLE, INSERT));
  console.log(`[patch-wasp-rollup] patched: ${file}`);
  return true;
}

function npmGlobalRoot() {
  try {
    return execSync('npm root -g', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const candidates = [];

const gRoot = npmGlobalRoot();
if (gRoot) {
  candidates.push(
    path.join(
      gRoot,
      '@wasp.sh/wasp-cli-linux-x64-glibc/data/Generator/templates/server/rollup.config.js'
    )
  );
}

// Already-generated project config (best-effort; regenerated on next compile).
candidates.push(
  path.resolve(__dirname, '..', '.wasp/out/server/rollup.config.js')
);

let patchedTemplate = false;
for (const file of candidates) {
  const ok = patchFile(file);
  if (ok && file.includes('templates')) patchedTemplate = true;
}

if (!patchedTemplate) {
  console.warn(
    '[patch-wasp-rollup] WARNING: Wasp CLI rollup template was not patched. ' +
      'The server bundle may fail with a Rollup "output.file" error.'
  );
}
