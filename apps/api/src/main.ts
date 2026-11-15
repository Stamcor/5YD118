import { buildApp } from './app.js';
import { ConfigError, loadConfig } from './core/config.js';
import { createDb } from './core/db.js';

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  const { db, close } = createDb(config.DATABASE_URL);
  const { app } = await buildApp({ config, db, logger: { level: 'info' } });

  const shutdown = async () => {
    await app.close();
    await close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
}

void main();
