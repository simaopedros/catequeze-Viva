import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import { useQuery } from "wasp/client/operations";

export const PARISH_ID = "parish-1";

export function parishCoordinator() {
  return { userRole: "PARISH_COORDINATOR", userId: "user-coord" };
}

export function dioceseAdmin() {
  return { userRole: "DIOCESE_ADMIN", userId: "user-diocese" };
}

export function leadCatechist() {
  return { userRole: "LEAD_CATECHIST", userId: "user-lead" };
}

export function stubUseQuery(rows: Array<[unknown, unknown]>) {
  vi.mocked(useQuery).mockImplementation((query: unknown) => {
    const hit = rows.find(([q]) => q === query);
    return {
      data: hit ? hit[1] : undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  });
}

export function renderPage(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}
