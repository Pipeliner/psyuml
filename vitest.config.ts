import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts', 'conformance/**/*.test.ts'],
    environment: 'node',
  },
});
