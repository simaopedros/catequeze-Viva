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

const OLD_HYDRATE = `const router = createBrowserRouter(routeObjects, {
  basename: "/",
  hydrationData,
})`;

const NEW_HYDRATE = `const router = createBrowserRouter(routeObjects, {
  basename: "/",
  hydrationData,
  hydrateFallbackElement: <div />,
})`;

const OLD_ROUTER_PROVIDER = '<RouterProvider router={router} />';
const NEW_ROUTER_PROVIDER = '<RouterProvider router={router} hydrateFallbackElement={<div />} />';
const OLD_LANG = '<html lang="en">';
const NEW_LANG = '<html lang="pt-BR">';
const OLD_NOSCRIPT_WASP = '<noscript>You need to enable JavaScript to run this app.</noscript>';
const OLD_NOSCRIPT_ISCLIENT = '{isClient && <noscript>You need to enable JavaScript to run this app.</noscript>}';
const NEW_NOSCRIPT_WASP = '<noscript suppressHydrationWarning>You need to enable JavaScript to run this app.</noscript>';
const GTM_NOSCRIPT = '\n          <noscript suppressHydrationWarning><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MTGNTJG6" height="0" width="0" style={{display:\'none\',visibility:\'hidden\'}}></iframe></noscript>';

// Layout file paths
const layoutSource = path.join(SDK_DIR, 'client', 'app', 'layout.tsx');
const layoutDist = path.join(SDK_DIR, 'dist', 'client', 'app', 'layout.tsx');

let patched = 0;

// Patch 1: hydrateFallbackElement
for (const file of [sourceFile, distFile]) {
  if (!fs.existsSync(file)) {
    console.warn(`[patch-hydrate-fallback] File not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('hydrateFallbackElement')) {
    console.log(`[patch-hydrate-fallback] Already patched (hydrate): ${path.relative(SDK_DIR, file)}`);
    continue;
  }

  if (!content.includes(OLD_HYDRATE.trim())) {
    console.warn(`[patch-hydrate-fallback] Hydrate pattern not found in ${path.relative(SDK_DIR, file)}.`);
    continue;
  }

  content = content.replace(OLD_HYDRATE, NEW_HYDRATE);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[patch-hydrate-fallback] Patched (hydrate): ${path.relative(SDK_DIR, file)}`);
  patched++;
}

// Patch 2: RouterProvider hydrateFallbackElement
for (const file of [sourceFile, distFile]) {
  if (!fs.existsSync(file)) {
    console.warn(`[patch-hydrate-fallback] File not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('RouterProvider router={router} hydrateFallbackElement')) {
    console.log(`[patch-hydrate-fallback] Already patched (RouterProvider): ${path.relative(SDK_DIR, file)}`);
    continue;
  }

  if (!content.includes(OLD_ROUTER_PROVIDER)) {
    console.warn(`[patch-hydrate-fallback] RouterProvider pattern not found in ${path.relative(SDK_DIR, file)}.`);
    continue;
  }

  content = content.replace(OLD_ROUTER_PROVIDER, NEW_ROUTER_PROVIDER);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[patch-hydrate-fallback] Patched (RouterProvider): ${path.relative(SDK_DIR, file)}`);
  patched++;
}

// Patch 3: lang attribute (pt-BR is the default locale)
for (const file of [layoutSource, layoutDist]) {
  if (!fs.existsSync(file)) {
    console.warn(`[patch-hydrate-fallback] Layout not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');

  if (content.includes(NEW_LANG)) {
    console.log(`[patch-hydrate-fallback] Already patched (lang): ${path.relative(SDK_DIR, file)}`);
    continue;
  }

  if (!content.includes(OLD_LANG)) {
    console.warn(`[patch-hydrate-fallback] Lang pattern not found in ${path.relative(SDK_DIR, file)}.`);
    continue;
  }

  content = content.replace(OLD_LANG, NEW_LANG);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[patch-hydrate-fallback] Patched (lang): ${path.relative(SDK_DIR, file)}`);
  patched++;
}

// Patch 4: fix <noscript> with suppressHydrationWarning + inject GTM noscript via React
for (const file of [layoutSource, layoutDist]) {
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');

  // Fix Wasp's noscript (both original and isClient variant)
  if (content.includes(OLD_NOSCRIPT_ISCLIENT)) {
    if (!content.includes(NEW_NOSCRIPT_WASP)) {
      content = content.replace(OLD_NOSCRIPT_ISCLIENT, NEW_NOSCRIPT_WASP);
      console.log(`[patch-hydrate-fallback] Patched (noscript isClient→suppress): ${path.relative(SDK_DIR, file)}`);
      patched++;
    }
  } else if (content.includes(OLD_NOSCRIPT_WASP)) {
    content = content.replace(OLD_NOSCRIPT_WASP, NEW_NOSCRIPT_WASP);
    console.log(`[patch-hydrate-fallback] Patched (noscript original→suppress): ${path.relative(SDK_DIR, file)}`);
    patched++;
  } else if (content.includes(NEW_NOSCRIPT_WASP)) {
    console.log(`[patch-hydrate-fallback] Already patched (noscript): ${path.relative(SDK_DIR, file)}`);
  } else {
    console.warn(`[patch-hydrate-fallback] Noscript pattern not found in ${path.relative(SDK_DIR, file)}.`);
  }

  // Inject GTM noscript after Wasp noscript (only if not already present)
  if (!content.includes('googletagmanager.com/ns.html')) {
    if (content.includes(NEW_NOSCRIPT_WASP)) {
      content = content.replace(NEW_NOSCRIPT_WASP, NEW_NOSCRIPT_WASP + GTM_NOSCRIPT);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`[patch-hydrate-fallback] Patched (GTM noscript): ${path.relative(SDK_DIR, file)}`);
      patched++;
    }
  } else {
    console.log(`[patch-hydrate-fallback] Already patched (GTM noscript): ${path.relative(SDK_DIR, file)}`);
  }

  fs.writeFileSync(file, content, 'utf8');
}

if (patched === 0) {
  console.log('[patch-hydrate-fallback] No files needed patching.');
}
