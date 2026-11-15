// AUTH-006 — create or promote an admin.
//   pnpm --filter @pilates/api admin:create --email admin@studio.test --name "Studio Admin"
//   podman-compose exec api node dist/modules/auth/cli/create-admin.js --email … --name …
// The password is prompted for (hidden) or read from stdin: echo "$PW" | … admin:create …
import { createInterface } from 'node:readline';
import { ConfigError, loadConfig } from '../../../core/config.js';
import { createDb } from '../../../core/db.js';
import { runMigrations } from '../../../core/migrate.js';
import { createAdmin, parseCreateAdminArgs } from '../admin.js';

async function readPassword(): Promise<string> {
  if (!process.stdin.isTTY) {
    let data = '';
    for await (const chunk of process.stdin) data += chunk;
    return data.replace(/\r?\n$/, '');
  }
  const ask = (q: string) =>
    new Promise<string>((resolve) => {
      const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
      const out = rl as unknown as { _writeToOutput: (s: string) => void };
      out._writeToOutput = (s) => {
        if (s.includes(q)) process.stdout.write(s);
      };
      rl.question(q, (a) => {
        rl.close();
        process.stdout.write('\n');
        resolve(a);
      });
    });
  const first = await ask('Password (min. 12 characters): ');
  if (first !== (await ask('Repeat password: '))) throw new Error('Passwords do not match');
  return first;
}

async function main() {
  const { email, name } = parseCreateAdminArgs(process.argv.slice(2));
  const config = loadConfig();
  const handle = createDb(config.DATABASE_URL);
  try {
    await runMigrations(handle);
    const result = await createAdmin(handle.db, { email, name, password: await readPassword() });
    console.log(`Admin ${email} ${result}.`);
  } finally {
    await handle.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof ConfigError || err instanceof Error ? err.message : err);
  process.exit(1);
});
