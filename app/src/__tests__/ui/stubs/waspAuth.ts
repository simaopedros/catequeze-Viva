/**
 * Stub de `wasp/client/auth` para testes de componente.
 */
import { vi } from "vitest";

export const useAuth = vi.fn(() => ({
  data: { isAdmin: false },
  isLoading: false,
  error: null,
}));
