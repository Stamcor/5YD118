// Composition root. Modules are discovered, not listed (PLAT-007), so a sparse checkout
// with only some modules still builds and runs.
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { systemClock, type Clock } from './core/clock.js';
import type { Config } from './core/config.js';
import type { Db } from './core/db.js';
import { registerErrorHandling } from './core/errors.js';
import { registerHealth, registerPublicConfig } from './core/health.js';
import { genReqId } from './core/logging.js';
import { registerSecurity } from './core/security.js';
import { discoverModules, sortByDependencies, type ModuleContext } from './core/module.js';
import { EventBus, ServiceRegistry, type ServiceMap } from './core/registry.js';
import './core/request-user.js';

export interface BuildAppOptions {
  config: Config;
  db: Db;
  clock?: Clock;
  /** Only load these modules (default: all discovered). */
  modules?: string[];
  /** Service overrides, e.g. fakes in tests. They win over module-provided services. */
  services?: Partial<ServiceMap>;
  /** Allow dependencies that are not loaded (tests that supply fakes instead). */
  allowMissingDependencies?: boolean;
  logger?: FastifyServerOptions['logger'];
}

const MODULES_DIR = fileURLToPath(new URL('./modules', import.meta.url));

export async function buildApp(
  opts: BuildAppOptions,
): Promise<{ app: FastifyInstance; ctx: ModuleContext }> {
  const app = Fastify({
    logger: opts.logger ?? false,
    genReqId,
    requestIdHeader: false,
    // Behind nginx (compose) the client address comes from X-Forwarded-For.
    trustProxy: true,
  });
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  const ctx: ModuleContext = {
    config: opts.config,
    db: opts.db,
    clock: opts.clock ?? systemClock,
    services: new ServiceRegistry(opts.services),
    events: new EventBus(app.log),
  };

  registerErrorHandling(app);
  await registerSecurity(app, opts.config);
  registerHealth(app);
  registerPublicConfig(app, opts.config);

  const modules = sortByDependencies(
    await discoverModules(MODULES_DIR, opts.modules),
    opts.allowMissingDependencies,
  );
  for (const m of modules) {
    await app.register(async (scope) => m.register(scope, ctx), { name: m.name });
  }

  await app.ready();
  return { app, ctx };
}
