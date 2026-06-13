/**
 * Patch: add hydrateFallbackElement to React Router's createBrowserRouter
 * in the Wasp-generated client entry.
 *
 * React Router v7.16+ requires a hydrateFallbackElement when using lazy routes.
 * Without it, hydration errors (#418) occur on pages with lazy component imports
 * (which is all Wasp routes).
 *
 * Run this script after `wasp compile` or `wasp build` — before starting the server.
 *
 * Usage:
 *   node scripts/patch-hydrate-fallback.cjs
 */

const fs = require('fs');
const path = require('path');

const SDK_DIR = path.join(__dirname, '..', '.wasp', 'out', 'sdk', 'wasp');

// Source file (used for dev server virtual modules)
const sourceFile = path.join(
  SDK_DIR, 'client', 'vite', 'virtual-files', 'files', 'client-entry.tsx'
);

// Dist file (produced by SDK build, used for production)
const distFile = path.join(
  SDK_DIR, 'dist', 'client', 'vite', 'virtual-files', 'files', 'client-entry.tsx'
);

const OLD = `const router = createBrowserRouter(routeObjects, {
  basename: "/",
  hydrationData,
})`;

const NEW = `const router = createBrowserRouter(routeObjects, {
  basename: "/",
  hydrationData,
  hydrateFallbackElement: <div />,
})`;

let patched = 0;

for (const file of [sourceFile, distFile]) {
  if (!fs.existsSync(file)) {
    console.warn(`[patch-hydrate-fallback] File not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('hydrateFallbackElement')) {
    console.log(`[patch-hydrate-fallback] Already patched: ${path.relative(SDK_DIR, file)}`);
    continue;
  }

  if (!content.includes(OLD.trim())) {
    console.warn(`[patch-hydrate-fallback] Pattern not found in ${path.relative(SDK_DIR, file)}. Wasp may have changed the template.`);
    continue;
  }

  content = content.replace(OLD, NEW);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[patch-hydrate-fallback] Patched: ${path.relative(SDK_DIR, file)}`);
  patched++;
}

if (patched === 0) {
  console.log('[patch-hydrate-fallback] No files needed patching.');
}
