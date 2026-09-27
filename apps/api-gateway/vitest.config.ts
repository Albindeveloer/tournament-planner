import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    clearMocks: true,
    // Gateway tests mock upstream services — files can run in parallel.
    fileParallelism: true,
    // Windows + parallel Fastify instances need more headroom than the 5s default.
    testTimeout: 15000,
  },
});
