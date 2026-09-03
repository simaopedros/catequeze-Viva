import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Testes de componente (jsdom).
 *
 * Separado de `vitest.config.ts` de propósito: aquele carrega
 * `src/__tests__/setup.ts`, que abre conexão com o Postgres e importa o SDK do
 * Wasp. Testes de UI não precisam de banco, e acoplá-los a ele faria a suíte
 * inteira depender de infraestrutura.
 *
 * Os módulos gerados pelo Wasp (`wasp/...`) só existem em `.wasp/out` depois de
 * compilar, então aqui são apontados para stubs — o que se quer exercitar é o
 * componente, não a camada de operações.
 */
export default defineConfig({
  // JSX pelo esbuild do próprio vitest — @vitejs/plugin-react exigiria vite 8,
  // e o projeto está no 7.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "wasp/client/operations": path.resolve(
        __dirname,
        "src/__tests__/ui/stubs/waspOperations.ts",
      ),
      "wasp/client/auth": path.resolve(
        __dirname,
        "src/__tests__/ui/stubs/waspAuth.ts",
      ),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.ui.test.tsx"],
    setupFiles: ["./src/__tests__/ui/setup.ts"],
    testTimeout: 15000,
  },
});
