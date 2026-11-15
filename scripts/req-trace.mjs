#!/usr/bin/env node
// Requirement ↔ test traceability. Zero dependencies, so it also runs in a sparse checkout
// before `pnpm install`.
//
//   node scripts/req-trace.mjs                 print the matrix
//   node scripts/req-trace.mjs --strict        exit 1 on violations (CI)
//   node scripts/req-trace.mjs --module booking
//   node scripts/req-trace.mjs --json req-trace.json
//
// See requirements/README.md#traceability-tests--requirements for the rules.
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REQ_DIR = join(ROOT, 'requirements');
const TEST_ROOTS = ['apps', 'packages', 'e2e'];
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', 'playwright-report']);

const PRIORITIES = ['Must', 'Should', 'Could', "Won't"];
const STATUSES = ['Draft', 'Approved', 'Implemented', 'Deprecated'];

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const onlyModule = valueOf('--module');
const jsonOut = valueOf('--json');

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (IGNORED_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Parse every requirements/<module>/spec.md that is present in the working tree. */
function loadRequirements() {
  const reqs = new Map();
  const problems = [];
  if (!existsSync(REQ_DIR)) return { reqs, problems };
  for (const mod of readdirSync(REQ_DIR)) {
    if (mod.startsWith('_')) continue;
    if (onlyModule && mod !== onlyModule) continue;
    const specPath = join(REQ_DIR, mod, 'spec.md');
    if (!existsSync(specPath)) continue;
    const lines = readFileSync(specPath, 'utf8').split('\n');
    let current = null;
    lines.forEach((line, idx) => {
      const h = /^###\s+([A-Z]{2,6}-\d{3})\s+[—–-]\s+(.+)$/.exec(line);
      if (h) {
        const [, id, title] = h;
        if (reqs.has(id))
          problems.push(`Duplicate requirement id ${id} (${mod}/spec.md:${idx + 1})`);
        current = {
          id,
          title: title.trim(),
          module: mod,
          priority: null,
          status: null,
          line: idx + 1,
        };
        reqs.set(id, current);
        return;
      }
      if (/^#{1,3}\s/.test(line)) current = null;
      if (!current) return;
      const f = /^-\s+\*\*(Priority|Status):\*\*\s*(.+?)\s*$/.exec(line);
      if (f) current[f[1].toLowerCase()] = f[2];
    });
  }
  for (const r of reqs.values()) {
    const where = `${r.module}/spec.md:${r.line}`;
    if (!PRIORITIES.includes(r.priority))
      problems.push(`${r.id}: invalid Priority "${r.priority}" (${where})`);
    if (!STATUSES.includes(r.status))
      problems.push(`${r.id}: invalid Status "${r.status}" (${where})`);
  }
  return { reqs, problems };
}

/** Find `[ID]` / `[ID/ACn]` references in test titles. */
function loadTestRefs() {
  const refs = new Map(); // id -> [{file, line, todo}]
  const ref = /\[([A-Z]{2,6}-\d{3})(?:\/AC\d+)?\]/g;
  const todo = /\b(?:it|test|describe)\s*\.\s*(?:todo|fixme|skip)\s*\(/;
  // Formatters may wrap long titles onto the line after `it.todo(`.
  const todoOpen = /\b(?:it|test|describe)\s*\.\s*(?:todo|fixme|skip)\s*\(\s*$/;
  for (const root of TEST_ROOTS) {
    for (const file of walk(join(ROOT, root))) {
      if (!TEST_FILE.test(file)) continue;
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, idx) => {
        for (const m of line.matchAll(ref)) {
          const list = refs.get(m[1]) ?? [];
          const isTodo = todo.test(line) || (idx > 0 && todoOpen.test(lines[idx - 1]));
          list.push({
            file: relative(ROOT, file).split(sep).join('/'),
            line: idx + 1,
            todo: isTodo,
          });
          refs.set(m[1], list);
        }
      });
    }
  }
  return refs;
}

const { reqs, problems } = loadRequirements();
const refs = loadTestRefs();
const violations = [...problems];
const rows = [];

for (const r of reqs.values()) {
  const traced = r.priority !== "Won't" && r.status !== 'Deprecated' && r.status !== 'Draft';
  const list = refs.get(r.id) ?? [];
  const real = list.filter((x) => !x.todo).length;
  const planned = list.length - real;
  let state = real > 0 ? 'tested' : planned > 0 ? 'planned' : 'missing';
  if (!traced) state = list.length ? state : '—';
  rows.push({ ...r, real, planned, state });
  if (!traced) continue;
  if (list.length === 0)
    violations.push(`${r.id} (${r.status}, ${r.priority}) has no test reference`);
  if (r.status === 'Implemented' && real === 0)
    violations.push(`${r.id} is Implemented but has only todo/fixme tests`);
}

// Orphans: tests referencing unknown ids. In a sparse checkout, other modules' specs may be
// absent, so only flag ids whose prefix belongs to a spec we actually loaded.
const loadedPrefixes = new Set([...reqs.keys()].map((id) => id.split('-')[0]));
for (const [id, list] of refs) {
  if (reqs.has(id) || !loadedPrefixes.has(id.split('-')[0])) continue;
  for (const x of list) violations.push(`Orphan reference [${id}] in ${x.file}:${x.line}`);
}

// ---- output ---------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n);
console.log(
  `${pad('ID', 10)}${pad('Priority', 9)}${pad('Status', 13)}${pad('Tests', 8)}${pad('Todo', 6)}${pad('State', 9)}Title`,
);
console.log('-'.repeat(100));
for (const r of rows) {
  console.log(
    `${pad(r.id, 10)}${pad(r.priority, 9)}${pad(r.status, 13)}${pad(r.real, 8)}${pad(r.planned, 6)}${pad(r.state, 9)}${r.title}`,
  );
}
const count = (s) => rows.filter((r) => r.state === s).length;
console.log('-'.repeat(100));
console.log(
  `${rows.length} requirements · ${count('tested')} tested · ${count('planned')} planned (todo) · ${count('missing')} missing`,
);

if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ requirements: rows, violations }, null, 2));

if (violations.length) {
  console.log(`\n${violations.length} traceability violation(s):`);
  for (const v of violations) console.log(`  ✗ ${v}`);
  if (strict) process.exit(1);
} else {
  console.log('\n✓ traceability OK');
}
