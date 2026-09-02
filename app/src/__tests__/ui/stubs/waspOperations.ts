/**
 * Stub de `wasp/client/operations` para testes de componente.
 *
 * O módulo real é gerado em `.wasp/out` na compilação e arrasta a stack de
 * queries do Wasp. Nos testes de UI o que interessa é o comportamento do
 * componente (foco, teclado, rótulos), não a ida ao servidor.
 */
import { vi } from "vitest";

export const createHousehold = vi.fn(async (args: Record<string, unknown>) => ({
  id: "household-teste",
  name: String(args.name ?? ""),
}));

export const getContactsForConversation = vi.fn(async () => []);
export const createConversation = vi.fn(async () => ({ id: "conversa-teste" }));

export const listAdminLicenses = vi.fn();
export const listPricingPlansAdmin = vi.fn();
export const extendTenantTrial = vi.fn();
export const setComplimentaryPlan = vi.fn();
export const cancelTenantLicense = vi.fn();
export const cancelUserSubscriptionImmediate = vi.fn();

export const useQuery = vi.fn((_query?: unknown) => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}));
export const useAction = (fn: unknown) => fn;
