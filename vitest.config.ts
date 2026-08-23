import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      exclude: ['packages/core/src/tailwind-theme.ts', 'packages/core/src/**/*.test.ts'],
      thresholds: { lines: 85, functions: 85, branches: 85 },
    },
  },
});
