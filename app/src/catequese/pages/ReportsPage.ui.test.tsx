import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReportsPage from "./ReportsPage";
import {
  getReportsOverview,
  getHierarchyAdoptionReport,
  useQuery,
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

vi.mock("../../i18n/useLocale", () => ({
  useLocale: () => ({ currentLocale: "pt-BR" }),
}));

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

  it("esconde a aba Adesão se o admin diocesano estiver na paróquia", () => {
    userCtx.current = dioceseAdmin();
    workspace.type = "PARISH";
    stubUseQuery([[getReportsOverview, REPORTS_OVERVIEW]]);
    renderPage(<ReportsPage />);
    expect(
      screen.queryByRole("button", { name: /Adesão/ }),
    ).not.toBeInTheDocument();
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

const PERFECT_CLASS = {
  id: "class-perfect",
  parishId: "parish-1",
  name: "Eucaristia A",
  totalEnrolled: 10,
  totalMeetings: 6,
  presentCount: 55,
  lateCount: 3,
  justifiedCount: 2,
  attendedCount: 60,
  absentCount: 0,
  attendanceRate: 100,
};

const ATTENTION_CLASS = {
  id: "class-attention",
  parishId: "parish-1",
  name: "Perseverança B",
  totalEnrolled: 8,
  totalMeetings: 5,
  presentCount: 15,
  lateCount: 0,
  justifiedCount: 0,
  attendedCount: 15,
  absentCount: 25,
  attendanceRate: 38,
};

describe("ReportsPage — presença", () => {
  beforeEach(() => {
    userCtx.current = parishCoordinator();
    workspace.type = "PARISH";
  });

  it("celebra as turmas com 100% de presença", () => {
    stubUseQuery([
      [
        getReportsOverview,
        {
          classReports: [...REPORTS_OVERVIEW.classReports, PERFECT_CLASS],
        },
      ],
    ]);
    renderPage(<ReportsPage />);

    const celebration = screen.getByTestId("reports-celebration");
    expect(celebration).toHaveTextContent("Turmas com presença perfeita");
    expect(celebration).toHaveTextContent("Eucaristia A");
    expect(celebration).not.toHaveTextContent("Crisma 2026");
    expect(screen.getAllByText("100% presença").length).toBeGreaterThan(0);
    expect(screen.getByText("2 turmas")).toBeInTheDocument();
  });

  it("mostra atenção acolhedora, sem estilo de erro, para presença baixa", () => {
    stubUseQuery([[getReportsOverview, { classReports: [ATTENTION_CLASS] }]]);
    renderPage(<ReportsPage />);

    const attention = screen.getByTestId("reports-attention");
    expect(attention).toHaveTextContent("Turmas que precisam de atenção");
    expect(attention).toHaveTextContent("Perseverança B: 38%");
    expect(attention.className).not.toMatch(/destructive/);
    expect(screen.queryByTestId("reports-celebration")).not.toBeInTheDocument();
  });

  it("exporta PDF pela impressão com a folha de relatório", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    stubUseQuery([
      [getReportsOverview, { classReports: [PERFECT_CLASS, ATTENTION_CLASS] }],
    ]);
    renderPage(<ReportsPage />);

    const sheet = await screen.findByTestId("reports-print-sheet");
    expect(sheet).toHaveTextContent("Relatório de presença das turmas");
    expect(sheet).toHaveTextContent("Período: Todo período");
    expect(sheet).toHaveTextContent("★ Turmas com presença perfeita");
    expect(sheet).toHaveTextContent("Cada encontro é uma semente");

    const button = screen.getByTestId("reports-export-pdf");
    expect(button).toBeEnabled();
    await user.click(button);
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it("desabilita o PDF quando não há turmas", () => {
    stubUseQuery([[getReportsOverview, { classReports: [] }]]);
    renderPage(<ReportsPage />);
    expect(screen.getByTestId("reports-export-pdf")).toBeDisabled();
    expect(screen.queryByTestId("reports-print-sheet")).not.toBeInTheDocument();
  });

  it("filtra o período no servidor", async () => {
    const user = userEvent.setup();
    stubUseQuery([[getReportsOverview, REPORTS_OVERVIEW]]);
    renderPage(<ReportsPage />);

    await user.click(screen.getByRole("button", { name: "Último mês" }));
    expect(useQuery).toHaveBeenCalledWith(
      getReportsOverview,
      expect.objectContaining({ period: "month" }),
      expect.anything(),
    );
  });
});
