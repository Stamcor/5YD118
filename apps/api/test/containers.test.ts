// Requirements: requirements/platform/spec.md (PLAT-013)
// Static checks of the container setup. The runtime check is scripts/compose-smoke.sh (CI job "containers").
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

describe('PLAT-013 — Whole stack starts with podman-compose up', () => {
  it('[PLAT-013/AC1] compose.yaml defines postgres, api, web and admin', () => {
    const compose = read('compose.yaml');
    for (const service of ['postgres', 'api', 'web', 'admin'])
      expect(compose).toMatch(new RegExp(`^  ${service}:`, 'm'));
  });

  it('[PLAT-013/AC2] web on 8080 and admin on 8081 proxy /api to the api service', () => {
    const compose = read('compose.yaml');
    expect(compose).toMatch(/\$\{WEB_PORT:-8080\}:80/);
    expect(compose).toMatch(/\$\{ADMIN_PORT:-8081\}:80/);
    const nginx = read('infra/nginx/default.conf.template');
    expect(nginx).toMatch(/location \/api\/\s*\{[^}]*proxy_pass \$\{API_UPSTREAM\}/s);
  });

  it('[PLAT-013/AC3] images are fully qualified; the api runs as non-root with prod deps only', () => {
    const files = [
      'compose.yaml',
      'infra/containers/api.Containerfile',
      'infra/containers/frontend.Containerfile',
    ];
    for (const f of files) {
      for (const [, image] of read(f).matchAll(/(?:^\s*image:|^FROM)\s+(\S+)/gm)) {
        if (image === '${IMAGE_PREFIX:-localhost/pilates}' || image?.startsWith('${')) continue;
        expect(image, `${f}: ${image}`).toMatch(/^(docker\.io|ghcr\.io|quay\.io|localhost)\//);
      }
    }
    const api = read('infra/containers/api.Containerfile');
    expect(api).toMatch(/^USER node$/m);
    expect(api).toContain('deploy --prod');
  });

  it('[PLAT-013/AC4] every required setting has a default that .env can override', () => {
    const compose = read('compose.yaml');
    for (const key of ['SESSION_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'])
      expect(compose).toMatch(new RegExp(`${key}: \\$\\{${key}:-[^}]+\\}`));
  });

  it('[PLAT-013/AC4] dev-server origins from .env do not leak into the container stack', () => {
    // .env.example sets WEB_ORIGIN=http://localhost:5173 for `pnpm dev`; the stack serves on 8080.
    const compose = read('compose.yaml');
    expect(compose).not.toMatch(/\$\{(WEB|ADMIN)_ORIGIN[:}]/);
    expect(compose).toContain('WEB_ORIGIN: ${PUBLIC_WEB_ORIGIN:-http://localhost:8080}');
    expect(compose).toContain('ADMIN_ORIGIN: ${PUBLIC_ADMIN_ORIGIN:-http://localhost:8081}');
  });

  it('[PLAT-013/AC5] the stripe profile forwards webhooks to the api', () => {
    const compose = read('compose.yaml');
    expect(compose).toMatch(/profiles: \['stripe'\]/);
    expect(compose).toContain('--forward-to api:3000/api/payments/webhook');
  });

  it('[PLAT-013/AC6] a smoke script exists and CI runs it', () => {
    expect(existsSync(new URL('scripts/compose-smoke.sh', root))).toBe(true);
    expect(read('.github/workflows/ci.yml')).toContain('scripts/compose-smoke.sh');
  });
});
