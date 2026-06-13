/**
 * Patch @radix-ui/react-focus-scope for React 19 compatibility.
 *
 * React 19 changed ref callback behavior: cleanup functions are now called.
 * The radix focus-scope uses:
 *   useComposedRefs(forwardedRef, (node) => setContainer(node))
 *
 * This anonymous function is recreated every render. React 19 sees the
 * changed ref and calls it with null (cleanup) then node (setup), which
 * triggers setContainer → re-render → new anonymous function → infinite loop.
 *
 * Fix: pass setContainer directly (React setState functions are stable).
 *
 * Run this after every `npm install`.
 * Usage: node scripts/patch-radix-focus-scope.cjs
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(
  __dirname, '..', 'node_modules', '@radix-ui', 'react-focus-scope', 'dist'
);

const files = [
  path.join(DIST_DIR, 'index.mjs'),
  path.join(DIST_DIR, 'index.js')
];

const TARGET = '(node) => setContainer(node)';
const REPLACEMENT = 'setContainer';

let patched = 0;

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.warn('[patch-radix-focus-scope] File not found:', file);
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');

  if (content.includes(TARGET)) {
    content = content.replaceAll(TARGET, REPLACEMENT);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`[patch-radix-focus-scope] Patched: ${path.basename(file)}`);
    patched++;
  } else if (content.includes(REPLACEMENT)) {
    console.log(`[patch-radix-focus-scope] Already patched: ${path.basename(file)}`);
    patched++;
  } else {
    console.warn(`[patch-radix-focus-scope] Pattern not found in: ${path.basename(file)}`);
  }
}

if (patched === files.length) {
  console.log('[patch-radix-focus-scope] Success: All files patched.');
} else {
  console.warn('[patch-radix-focus-scope] Warning: Not all files were patched successfully.');
}
