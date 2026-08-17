/**
 * Flags imported identifiers that are never referenced in the file.
 * Dead imports don't break the Vite build, but they signal copy-paste drift.
 *
 * Run: node scripts/check-unused-imports.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk('src').filter((f) => f.endsWith('.jsx') || f.endsWith('.js'));
const findings = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');

  // Collect imported identifiers
  const imported = [];
  for (const m of src.matchAll(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"];?$/gm)) {
    const clause = m[1];

    // Named: { a, b as c }
    const namedBlock = clause.match(/\{([\s\S]*?)\}/);
    if (namedBlock) {
      namedBlock[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((spec) => {
          const local = spec.includes(' as ') ? spec.split(' as ')[1].trim() : spec;
          if (local) imported.push(local);
        });
    }

    // Default / namespace, e.g. `React`, `React, { useState }`, `* as x`
    const head = clause.replace(/\{[\s\S]*?\}/, '').replace(/,/g, ' ').trim();
    const ns = head.match(/\*\s+as\s+(\w+)/);
    if (ns) imported.push(ns[1]);
    else if (head && /^\w+$/.test(head)) imported.push(head);
  }

  // Strip the import block so we only search real usage
  const body = src.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?$/gm, '');

  const unused = imported.filter((name) => {
    // React is needed for classic JSX runtime even if not referenced
    if (name === 'React') return false;
    return !new RegExp(`\\b${name.replace(/[$]/g, '\\$')}\\b`).test(body);
  });

  if (unused.length) findings.push({ file, unused });
}

console.log(`Scanned ${files.length} files`);
if (findings.length) {
  console.log('\nUnused imports:');
  for (const f of findings) console.log(`  ${f.file} -> ${f.unused.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('OK: no unused imports.');
}
