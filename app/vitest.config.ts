import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/.wasp/**',
      '**/e2e-tests/**',
      '**/tests/e2e/**',
      // Testes de componente precisam de jsdom e rodam por vitest.ui.config.ts.
      // Sem esta exclusão o `test`/`test:integration` os pega neste ambiente
      // `node` e eles quebram em "Cannot read properties of undefined
      // (reading 'navigator')".
      '**/*.ui.test.tsx',
    ],
  },
});
