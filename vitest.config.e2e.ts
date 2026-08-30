import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Guards against running on a non-test database, then applies the
    // migrations. Runs once for the whole suite, not per file.
    globalSetup: ['./test/global-setup.ts'],
    // One database, shared by every file. Running the suites in parallel
    // against it would let one file's writes surface in another's reads.
    fileParallelism: false,
    // Starting Nest and connecting to Postgres is slower than the 5s
    // default allows, particularly on the first file in CI.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
