import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// e2e memakai build `dist/` (tsc memancarkan decorator metadata untuk DI Nest),
// DB `<nama>_test` dan Redis db 1 agar tidak bentrok dengan server dev.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup-env.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    env: {
      REDIS_URL: 'redis://localhost:6379/1',
      NODE_ENV: 'test',
      OPENROUTER_API_KEY: '',
    },
  },
});
