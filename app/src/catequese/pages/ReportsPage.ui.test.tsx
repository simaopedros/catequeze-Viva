import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReportsPage from "./ReportsPage";
import {
  getReportsOverview,
  getHierarchyAdoptionReport,
} from "wasp/client/operations";
import {
  ADOPTION_REPORT,
  REPORTS_OVERVIEW,
} from "../../__tests__/ui/hierarchyFixtures";
import {
  dioceseAdmin,
  parishCoordinator,
  renderPage,
  stubUseQuery,
} from "../../__tests__/ui/hierarchyTestUtils";

const userCtx = vi.hoisted(() => ({
  current: { userRole: "PARISH_COORDINATOR", userId: "user-coord" },
}));
const workspace = vi.hoisted(() => ({ type: "PARISH" }));

vi.mock("react-i18next", async () => {
  const { mockUseTranslation } = await import(
    "../../__tests__/ui/hierarchyFixtures"
  );
  return {
    useTranslation: (ns?: string) => mockUseTranslation(ns),
  };
});

vi.mock("../../client/hooks/useActiveParish", () => ({
  useActiveParish: () => ({ activeParishId: "parish-1" }),
}));

vi.mock("../../client/hooks/useActiveWorkspace", () => ({
  useActiveWorkspace: () => ({ workspaceType: workspace.type }),
}));

vi.mock("../../client/hooks/useUserContext", () => ({
  useUserContext: () => userCtx.current,
}));

describe("ReportsPage — adesão", () => {
  beforeEach(() => {
    userCtx.current = parishCoordinator();
    workspace.type = "PARISH";
  });

  it("esconde a aba Adesão na paróquia", () => {
    stubUseQuery([[getReportsOverview, REPORTS_OVERVIEW]]);
    renderPage(<ReportsPage />);
    expect(
      screen.queryByRole("button", { name: /Adesão/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("adoption-report")).not.toBeInTheDocument();
  });

  it("mostra adesão entre paróquias para o admin da diocese", async () => {
    const user = userEvent.setup();
    userCtx.current = dioceseAdmin();
    workspace.type = "DIOCESE";
    stubUseQuery([
      [getReportsOverview, REPORTS_OVERVIEW],
      [getHierarchyAdoptionReport, ADOPTION_REPORT],
    ]);
    renderPage(<ReportsPage />);

    await user.click(screen.getByRole("button", { name: /Adesão/ }));
    const panel = screen.getByTestId("adoption-report");
    expect(panel).toHaveTextContent("Adesão entre paróquias");
    expect(panel).toHaveTextContent("Paróquia São José (TESTE)");
    expect(panel).toHaveTextContent("Paróquia Santa Maria (TESTE)");
    expect(panel).toHaveTextContent("Recursos publicados");
  });
});
