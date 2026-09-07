import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormationPage from "./FormationPage";
import {
  listFormationTracks,
  createFormationTrack,
  enrollInFormationTrack,
} from "wasp/client/operations";
import {
  FORMATION_TRACK,
  LOCAL_FORMATION_TRACK,
} from "../../__tests__/ui/hierarchyFixtures";
import {
  parishCoordinator,
  leadCatechist,
  renderPage,
  stubUseQuery,
} from "../../__tests__/ui/hierarchyTestUtils";

const userCtx = vi.hoisted(() => ({
  current: { userRole: "PARISH_COORDINATOR", userId: "user-coord" },
}));

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

vi.mock("../../client/hooks/useUserContext", () => ({
  useUserContext: () => userCtx.current,
}));

vi.mock("../../client/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("FormationPage", () => {
  beforeEach(() => {
    userCtx.current = parishCoordinator();
    vi.mocked(createFormationTrack).mockResolvedValue({ id: "new" } as never);
    vi.mocked(enrollInFormationTrack).mockResolvedValue({} as never);
  });

  it("mostra estado vazio", () => {
    stubUseQuery([[listFormationTracks, []]]);
    renderPage(<FormationPage />);
    expect(screen.getByTestId("empty-formation")).toHaveTextContent(
      "Nenhuma formação",
    );
  });

  it("cria uma trilha local", async () => {
    const user = userEvent.setup();
    stubUseQuery([[listFormationTracks, []]]);
    renderPage(<FormationPage />);

    await user.click(screen.getByRole("button", { name: "Nova formação" }));
    await user.type(screen.getByLabelText("Nome"), "Formação permanente 2026");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    expect(createFormationTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "parish-1",
        name: "Formação permanente 2026",
        kind: "INITIAL",
      }),
    );
  });

  it("inscreve na trilha diocesana e oferece abrir o detalhe", async () => {
    const user = userEvent.setup();
    stubUseQuery([[listFormationTracks, [FORMATION_TRACK]]]);
    renderPage(<FormationPage />);

    expect(
      screen.getByText("Formação inicial de catequistas"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("origin-badge")).toHaveTextContent("Diocese");
    expect(
      screen.queryByRole("button", { name: "Encontro" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inscrever-me" }));
    expect(enrollInFormationTrack).toHaveBeenCalledWith({
      trackId: FORMATION_TRACK.id,
      workspaceId: "parish-1",
    });
    expect(
      screen.getByRole("link", { name: /Abrir formação/i }),
    ).toHaveAttribute("href", "/app/formation/track-1");
  });

  it("esconde criação do catequista e ainda oferece inscrição", () => {
    userCtx.current = leadCatechist();
    stubUseQuery([
      [listFormationTracks, [FORMATION_TRACK, LOCAL_FORMATION_TRACK]],
    ]);
    renderPage(<FormationPage />);
    expect(
      screen.queryByRole("button", { name: "Nova formação" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Inscrever-me" }),
    ).toBeInTheDocument();
  });
});
