// PLAT-007 — module definition and loader.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FastifyInstance } from 'fastify';
import type { Clock } from './clock.js';
import type { Config } from './config.js';
import type { Db } from './db.js';
import type { EventBus, ServiceRegistry } from './registry.js';

export interface ModuleContext {
  config: Config;
  db: Db;
  clock: Clock;
  services: ServiceRegistry;
  events: EventBus;
}

export interface AppModule {
  /** Must equal the directory name and the requirements module id. */
  name: string;
  dependsOn: string[];
  register(app: FastifyInstance, ctx: ModuleContext): void | Promise<void>;
}

export const defineModule = (m: AppModule): AppModule => m;

/** Discover `modules/<name>/index.(ts|js)` and import their default export. */
export async function discoverModules(modulesDir: string, only?: string[]): Promise<AppModule[]> {
  if (!existsSync(modulesDir)) return [];
  const found: AppModule[] = [];
  for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (only && !only.includes(entry.name)) continue;
    const file = ['index.ts', 'index.js']
      .map((f) => join(modulesDir, entry.name, f))
      .find((f) => existsSync(f));
    if (!file) continue;
    const mod = (await import(pathToFileURL(file).href)) as { default?: AppModule };
    if (!mod.default) throw new Error(`Module "${entry.name}" has no default export`);
    if (mod.default.name !== entry.name)
      throw new Error(`Module in "${entry.name}/" is named "${mod.default.name}"`);
    found.push(mod.default);
  }
  return found;
}

/**
 * Topologically sort modules by `dependsOn`. `platform` is the core itself and is
 * always satisfied. Unless `allowMissing`, a dependency that is not loaded is an error.
 */
export function sortByDependencies(modules: AppModule[], allowMissing = false): AppModule[] {
  const byName = new Map(modules.map((m) => [m.name, m]));
  const sorted: AppModule[] = [];
  const state = new Map<string, 'visiting' | 'done'>();

  const visit = (m: AppModule, path: string[]) => {
    if (state.get(m.name) === 'done') return;
    if (state.get(m.name) === 'visiting')
      throw new Error(`Module dependency cycle: ${[...path, m.name].join(' → ')}`);
    state.set(m.name, 'visiting');
    for (const dep of m.dependsOn) {
      if (dep === 'platform') continue;
      const d = byName.get(dep);
      if (d) visit(d, [...path, m.name]);
      else if (!allowMissing)
        throw new Error(`Module "${m.name}" depends on "${dep}", which is not loaded`);
    }
    state.set(m.name, 'done');
    sorted.push(m);
  };
  for (const m of modules) visit(m, []);
  return sorted;
}
