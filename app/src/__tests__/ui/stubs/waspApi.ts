/**
 * Stub de `wasp/client/api` para testes de componente. O módulo real é gerado
 * em `.wasp/out` na compilação; os testes que precisam de respostas mockam `api`.
 */
import { vi } from "vitest";

export const api = { get: vi.fn(), post: vi.fn() };
