import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@pilates/contracts': fileURLToPath(new URL('../contracts/src/index.ts', import.meta.url)),
    },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'] },
});
