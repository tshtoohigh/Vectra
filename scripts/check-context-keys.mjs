/**
 * Verifies that every key destructured from useApp() somewhere in src/
 * is actually provided by AppContext's context value.
 *
 * Run: node scripts/check-context-keys.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(SRC).filter((f) => f.endsWith('.jsx') || f.endsWith('.js'));

// ---------- 1. Collect what AppContext provides ----------
const ctxSource = readFileSync(join(SRC, 'context', 'AppContext.jsx'), 'utf8');

// Keys listed in the `value` object (handles `key,` and `key:` forms)
const valueBlock = ctxSource.slice(
  ctxSource.indexOf('const value = useMemo('),
  ctxSource.indexOf('return <AppContext.Provider')
);
const provided = new Set();
for (const m of valueBlock.matchAll(/^\s{6}([a-zA-Z][a-zA-Z0-9]*)[,:]/gm)) {
  provided.add(m[1]);
}

// Keys coming in via the `...derived` spread
const derivedBlock = ctxSource.slice(
  ctxSource.indexOf('const derived = useMemo('),
  ctxSource.indexOf('const value = useMemo(')
);
const returnStart = derivedBlock.indexOf('return {');
for (const m of derivedBlock.slice(returnStart).matchAll(/^\s{6}([a-zA-Z][a-zA-Z0-9]*)[,:]/gm)) {
  provided.add(m[1]);
}

// ---------- 2. Collect what consumers destructure ----------
const problems = [];
let checked = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  // Match `const { ... } = useApp()` across newlines
  for (const m of src.matchAll(/const\s*\{([\s\S]*?)\}\s*=\s*\n?\s*useApp\(\)/g)) {
    checked += 1;
    const keys = m[1]
      .split(',')
      .map((k) => k.split(':')[0].trim())
      .filter(Boolean);

    const missing = keys.filter((k) => !provided.has(k));
    if (missing.length) problems.push({ file, missing });
  }
}

// ---------- 3. Report ----------
console.log(`AppContext provides ${provided.size} keys`);
console.log(`Checked ${checked} useApp() destructure site(s) across ${files.length} files\n`);

if (problems.length) {
  console.error('MISMATCHES FOUND:');
  for (const p of problems) console.error(`  ${p.file} -> ${p.missing.join(', ')}`);
  process.exit(1);
}

console.log('OK: every destructured key is provided by AppContext.');
