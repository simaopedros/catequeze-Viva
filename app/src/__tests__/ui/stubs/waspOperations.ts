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

export const searchDiocesesForOnboarding = vi.fn();
export const createDiocese = vi.fn();

export const listOfficialResources = vi.fn();
export const createOfficialResource = vi.fn();
export const publishOfficialResource = vi.fn();
export const adoptOfficialResource = vi.fn();
export const updateOfficialResource = vi.fn();
export const deleteOfficialResource = vi.fn();
export const removeOfficialResourceAttachment = vi.fn();

export const listPastoralAnnouncements = vi.fn();
export const createPastoralAnnouncement = vi.fn();
export const publishPastoralAnnouncement = vi.fn();
export const acknowledgePastoralAnnouncement = vi.fn();
export const republishPastoralAnnouncement = vi.fn();

export const listFormationTracks = vi.fn();
export const getFormationTrack = vi.fn();
export const createFormationTrack = vi.fn();
export const updateFormationTrack = vi.fn();
export const deleteFormationTrack = vi.fn();
export const createFormationSession = vi.fn();
export const updateFormationSession = vi.fn();
export const deleteFormationSession = vi.fn();
export const enrollInFormationTrack = vi.fn();
export const unenrollFromFormationTrack = vi.fn();
export const markFormationAttendance = vi.fn();

export const listCatecheticalItineraries = vi.fn();
export const createCatecheticalItinerary = vi.fn();
export const publishCatecheticalItinerary = vi.fn();
export const instantiateCatecheticalItinerary = vi.fn();
export const updateCatecheticalItinerary = vi.fn();
export const deleteCatecheticalItinerary = vi.fn();
export const listCatecheticalYears = vi.fn();
export const createCatecheticalYear = vi.fn();

export const getReportsOverview = vi.fn();
export const getHierarchyAdoptionReport = vi.fn();

export const listLiturgicalEvents = vi.fn();
export const listClasses = vi.fn();
export const listMeetingsForClasses = vi.fn(async () => []);
export const createLiturgicalEvent = vi.fn();
export const deleteLiturgicalEvent = vi.fn();

export const getAppBootstrap = vi.fn();
export const updateLocalePreference = vi.fn();

export const useQuery = vi.fn((_query?: unknown) => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}));
export const useAction = (fn: unknown) => fn;
