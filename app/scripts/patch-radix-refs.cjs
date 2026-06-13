/**
 * Patch Radix UI components for React 19 compatibility.
 *
 * React 19 changed ref callback behavior: cleanup functions are now called.
 * Several Radix components use anonymous functions as ref callbacks, which
 * are recreated every render, causing infinite update loops.
 *
 * Fix: pass the setState function directly (React setState functions are stable).
 *
 * Run via postinstall: npm install
 * Usage: node scripts/patch-radix-refs.cjs
 */

const fs = require('fs');
const path = require('path');

const PATCHES = [
  // [package, ESM pattern, replacement, CJS pattern]
  ['react-focus-scope',       '(node) => setContainer(node)', 'setContainer'],
  ['react-dismissable-layer', '(node2) => setNode(node2)',    'setNode'],
  ['react-popper',            '(node) => setContent(node)',   'setContent'],
  ['react-select',            '(node) => setContent(node)',   'setContent'],
  ['react-toast',             '(node2) => setNode(node2)',    'setNode'],
];

const FORMATS = ['index.mjs', 'index.js'];

let totalPatched = 0;
let totalAlready = 0;

for (const [pkg, esmPattern, replacement] of PATCHES) {
  const distDir = path.join(__dirname, '..', 'node_modules', '@radix-ui', pkg, 'dist');
  if (!fs.existsSync(distDir)) continue;

  for (const fmt of FORMATS) {
    const file = path.join(distDir, fmt);
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');

    // Already patched?
    if (content.includes(`forwardedRef, ${replacement})`)) {
      totalAlready++;
      continue;
    }

    const isESM = fmt === 'index.mjs';
    
    if (isESM) {
      // ESM: useComposedRefs(forwardedRef, (node) => setContent(node))
      if (!content.includes(esmPattern)) continue;
      content = content.replaceAll(esmPattern, replacement);
      content = content.replaceAll(
        `useComposedRefs(forwardedRef, ${esmPattern})`,
        `useComposedRefs(forwardedRef, ${replacement})`
      );
    } else {
      // CJS: (0, import_react_compose_refs.useComposedRefs)(forwardedRef, (node) => setContent(node))
      const cjsPattern = `(0, import_react_compose_refs.useComposedRefs)(forwardedRef, ${esmPattern})`;
      const cjsReplacement = `(0, import_react_compose_refs.useComposedRefs)(forwardedRef, ${replacement})`;
      
      if (content.includes(cjsPattern)) {
        content = content.replaceAll(cjsPattern, cjsReplacement);
      } else {
        // Try direct sed-style pattern
        const altPattern = `useComposedRefs)(forwardedRef, ${esmPattern})`;
        const altReplacement = `useComposedRefs)(forwardedRef, ${replacement})`;
        if (!content.includes(altPattern)) continue;
        content = content.replaceAll(altPattern, altReplacement);
      }
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`[patch-radix-refs] ${pkg}/${fmt}`);
    totalPatched++;
  }
}

if (totalPatched > 0) {
  console.log(`[patch-radix-refs] Patched ${totalPatched} file(s).`);
} else if (totalAlready > 0) {
  console.log(`[patch-radix-refs] Already patched: ${totalAlready} file(s).`);
} else {
  console.log('[patch-radix-refs] No files needed patching.');
}
