import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatecheticalYearsPage from "./CatecheticalYearsPage";
import {
  listCatecheticalYears,
  listCatecheticalItineraries,
  createCatecheticalItinerary,
  publishCatecheticalItinerary,
  instantiateCatecheticalItinerary,
} from "wasp/client/operations";
import {
  DRAFT_ITINERARY,
  PUBLISHED_ITINERARY,
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

vi.mock("../../i18n/useLocale", () => ({
  useLocale: () => ({ currentLocale: "pt-BR" }),
}));

vi.mock("../../client/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("CatecheticalYearsPage — itinerários", () => {
  beforeEach(() => {
    userCtx.current = parishCoordinator();
    workspace.type = "PARISH";
    vi.mocked(createCatecheticalItinerary).mockResolvedValue({
      id: "new",
    } as never);
    vi.mocked(publishCatecheticalItinerary).mockResolvedValue({} as never);
    vi.mocked(instantiateCatecheticalItinerary).mockResolvedValue({} as never);
  });

  it("cria um itinerário e publica o rascunho paroquial", async () => {
    const user = userEvent.setup();
    stubUseQuery([
      [listCatecheticalYears, []],
      [listCatecheticalItineraries, [DRAFT_ITINERARY]],
    ]);
    renderPage(<CatecheticalYearsPage />);

    expect(screen.getByText("Itinerários oficiais")).toBeInTheDocument();
    expect(screen.getByText("Crisma 3 anos")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(
        "Nome do itinerário (ex.: Eucaristia 2 anos)",
      ),
      "Iniciação de adultos",
    );
    await user.click(screen.getByRole("button", { name: "Criar itinerário" }));
    expect(createCatecheticalItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "parish-1",
        name: "Iniciação de adultos",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Publicar" }));
    expect(publishCatecheticalItinerary).toHaveBeenCalledWith({
      id: DRAFT_ITINERARY.id,
    });
  });

  it("instancia um itinerário publicado na paróquia", async () => {
    const user = userEvent.setup();
    stubUseQuery([
      [listCatecheticalYears, []],
      [listCatecheticalItineraries, [PUBLISHED_ITINERARY]],
    ]);
    renderPage(<CatecheticalYearsPage />);

    expect(screen.getByTestId("origin-badge")).toHaveTextContent("Diocese");
    await user.click(screen.getByRole("button", { name: "Instanciar ano" }));
    await user.type(screen.getByLabelText("Nome"), "Catequese 2026");
    await user.type(screen.getByLabelText("Início"), "2026-03-01");
    await user.type(screen.getByLabelText("Término"), "2026-11-30");
    const instantiate = screen.getAllByRole("button", {
      name: "Instanciar ano",
    });
    await user.click(instantiate[instantiate.length - 1]);

    expect(instantiateCatecheticalItinerary).toHaveBeenCalledWith({
      itineraryId: PUBLISHED_ITINERARY.id,
      workspaceId: "parish-1",
      name: "Catequese 2026",
      startDate: "2026-03-01",
      endDate: "2026-11-30",
    });
  });

  it("não oferece instanciar no espaço da diocese", () => {
    userCtx.current = dioceseAdmin();
    workspace.type = "DIOCESE";
    stubUseQuery([
      [listCatecheticalYears, []],
      [listCatecheticalItineraries, [PUBLISHED_ITINERARY]],
    ]);
    renderPage(<CatecheticalYearsPage />);
    expect(
      screen.queryByRole("button", { name: "Instanciar ano" }),
    ).not.toBeInTheDocument();
  });
});
