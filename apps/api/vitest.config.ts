import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/application/**/*.ts', 'src/domain/**/*.ts', 'src/ai/**/*.ts'],
      thresholds: { lines: 80, functions: 80, branches: 65, statements: 80 },
    },
  },
});
