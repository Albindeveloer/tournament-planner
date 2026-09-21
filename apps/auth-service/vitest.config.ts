import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    clearMocks: true,
    // Integration tests share a real database — run files sequentially to prevent
    // one file's beforeEach from deleting data that another file's test is using.
    fileParallelism: false,
  },
});
