#!/usr/bin/env node
// Compute (and optionally apply) the minimal git sparse checkout for working on ONE module.
// Zero dependencies. Manifests are read with `git show`, so this works in a sparse clone
// before the module itself is checked out.
//
//   node scripts/agent-workspace.mjs --list                 list modules and dependencies
//   node scripts/agent-workspace.mjs booking                print sparse-checkout patterns
//   node scripts/agent-workspace.mjs booking --context      print the files to read first
//   node scripts/agent-workspace.mjs booking --apply        apply as a sparse checkout
//   node scripts/agent-workspace.mjs --reset                check out everything again
//   node scripts/agent-workspace.mjs --check                validate all manifests (CI)
//
// See docs/agent-workflow.md.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const moduleArg = args.find((a) => !a.startsWith('--'));

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });

/**
 * Read a file from the working tree (includes local edits) or, if it is not checked out
 * (sparse checkout), from HEAD.
 */
function readRepoFile(path) {
  const p = join(ROOT, path);
  if (existsSync(p)) return readFileSync(p, 'utf8');
  try {
    return git('show', `HEAD:${path}`);
  } catch {
    return null;
  }
}

/** Module ids = directories under requirements/ in HEAD ∪ working tree. */
function listModuleIds() {
  const names = new Set();
  try {
    for (const n of git('ls-tree', '--name-only', 'HEAD', 'requirements/').split('\n'))
      names.add(n.replace(/^requirements\//, ''));
  } catch {
    /* no commits yet */
  }
  const dir = join(ROOT, 'requirements');
  if (existsSync(dir))
    for (const e of readdirSync(dir, { withFileTypes: true }))
      if (e.isDirectory()) names.add(e.name);
  return [...names].filter((n) => n && !n.startsWith('_') && !n.includes('.')).sort();
}

function loadManifests() {
  const manifests = new Map();
  for (const id of listModuleIds()) {
    const raw = readRepoFile(`requirements/${id}/module.json`);
    if (raw) manifests.set(id, JSON.parse(raw));
  }
  return manifests;
}

const manifests = loadManifests();

function fail(msg) {
  console.error(`agent-workspace: ${msg}`);
  process.exit(1);
}

// ---- --check ---------------------------------------------------------------
function check() {
  const errors = [];
  const prefixes = new Map();
  for (const [id, m] of manifests) {
    if (m.id !== id) errors.push(`${id}/module.json: id "${m.id}" does not match directory`);
    if (prefixes.has(m.prefix))
      errors.push(`prefix ${m.prefix} used by ${prefixes.get(m.prefix)} and ${id}`);
    prefixes.set(m.prefix, id);
    for (const d of m.dependsOn)
      if (!manifests.has(d)) errors.push(`${id} depends on unknown module "${d}"`);
    for (const f of ['spec.md', 'interface.md'])
      if (readRepoFile(`requirements/${id}/${f}`) === null) errors.push(`${id}: missing ${f}`);
  }
  // cycle detection (DFS)
  const state = new Map();
  const visit = (id, stack) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'active')
      return errors.push(`dependency cycle: ${[...stack, id].join(' → ')}`);
    state.set(id, 'active');
    for (const d of manifests.get(id)?.dependsOn ?? []) visit(d, [...stack, id]);
    state.set(id, 'done');
  };
  for (const id of manifests.keys()) visit(id, []);
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    process.exit(1);
  }
  console.log(`✓ ${manifests.size} module manifests valid, dependency graph is acyclic`);
}

// ---- pattern computation ---------------------------------------------------
function patternsFor(id) {
  const m = manifests.get(id);
  if (!m) fail(`unknown module "${id}". Known: ${[...manifests.keys()].join(', ')}`);
  const deps = m.dependsOn;
  const dir = (p) => `/${p.replace(/\/$/, '')}/`;
  const fileOrDir = (p) => (/\.[a-z]+$/.test(p) ? `/${p}` : dir(p));

  const patterns = [
    '# root files, tooling and docs',
    '/*',
    '!/*/',
    '/.github/',
    '/scripts/',
    '/docs/',
    '/infra/',
    '# requirements: shared context, own module, dependency interfaces only',
    '/requirements/README.md',
    '/requirements/_shared/',
    '/requirements/_templates/',
    dir(`requirements/${id}`),
    ...deps.flatMap((d) => [`/requirements/${d}/interface.md`, `/requirements/${d}/module.json`]),
    '# shared packages (contracts are the cross-app interface)',
    '/packages/',
    '# app shells without other modules/features',
    '/apps/',
    '!/apps/api/src/modules/*/',
    '!/apps/web/src/features/*/',
    '!/apps/admin/src/features/*/',
    '/e2e/',
    '!/e2e/tests/*/',
    `# module code: ${id}`,
    ...['api', 'web', 'admin', 'e2e'].flatMap((layer) => (m.paths[layer] ?? []).map(fileOrDir)),
    '# dependency public surface (types + fakes for tests)',
    ...deps
      .filter((d) => d !== 'platform')
      .flatMap((d) => [
        `/apps/api/src/modules/${d}/public.ts`,
        `/apps/api/src/modules/${d}/testing.ts`,
      ]),
  ];
  return patterns;
}

function contextFor(id) {
  const m = manifests.get(id);
  if (!m) fail(`unknown module "${id}"`);
  return [
    'AGENTS.md',
    'requirements/README.md',
    'requirements/_shared/glossary.md',
    'requirements/_shared/domain-model.md',
    'requirements/_shared/api-conventions.md',
    'requirements/platform/interface.md',
    `requirements/${id}/spec.md`,
    `requirements/${id}/interface.md`,
    ...m.dependsOn.filter((d) => d !== 'platform').map((d) => `requirements/${d}/interface.md`),
    ...(m.paths.contracts ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);
}

// ---- main ------------------------------------------------------------------
if (flag('--check')) {
  check();
} else if (flag('--list')) {
  for (const [id, m] of manifests)
    console.log(
      `${id.padEnd(12)} ${m.prefix.padEnd(6)} depends on: ${m.dependsOn.join(', ') || '—'}`,
    );
} else if (flag('--reset')) {
  git('sparse-checkout', 'disable');
  console.log('Sparse checkout disabled: the full tree is checked out.');
} else if (moduleArg) {
  if (flag('--context')) {
    console.log(contextFor(moduleArg).join('\n'));
  } else {
    const patterns = patternsFor(moduleArg).filter((p) => !p.startsWith('#'));
    if (flag('--apply')) {
      execFileSync('git', ['sparse-checkout', 'set', '--no-cone', '--stdin'], {
        cwd: ROOT,
        input: patterns.join('\n') + '\n',
        stdio: ['pipe', 'inherit', 'inherit'],
      });
      console.log(`Sparse checkout set for module "${moduleArg}". Read these first:\n`);
      console.log(
        contextFor(moduleArg)
          .map((f) => `  ${f}`)
          .join('\n'),
      );
    } else {
      console.log(patternsFor(moduleArg).join('\n'));
    }
  }
} else {
  console.log(
    readFileSync(fileURLToPath(import.meta.url), 'utf8')
      .split('\n')
      .slice(1, 13)
      .join('\n'),
  );
}
