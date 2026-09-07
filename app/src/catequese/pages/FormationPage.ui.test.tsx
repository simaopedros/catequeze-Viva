import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormationPage from "./FormationPage";
import {
  listFormationTracks,
  createFormationTrack,
  createFormationSession,
  enrollInFormationTrack,
  markFormationAttendance,
} from "wasp/client/operations";
import {
  ENROLLED_TRACK,
  FORMATION_TRACK,
} from "../../__tests__/ui/hierarchyFixtures";
import {
  parishCoordinator,
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

vi.mock("../../i18n/useLocale", () => ({
  useLocale: () => ({ currentLocale: "pt-BR" }),
}));

vi.mock("../../client/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("FormationPage", () => {
  beforeEach(() => {
    userCtx.current = parishCoordinator();
    vi.mocked(createFormationTrack).mockResolvedValue({ id: "new" } as never);
    vi.mocked(createFormationSession).mockResolvedValue({} as never);
    vi.mocked(enrollInFormationTrack).mockResolvedValue({} as never);
    vi.mocked(markFormationAttendance).mockResolvedValue({} as never);
  });

  it("mostra estado vazio", () => {
    stubUseQuery([[listFormationTracks, []]]);
    renderPage(<FormationPage />);
    expect(screen.getByTestId("empty-formation")).toHaveTextContent(
      "Nenhuma trilha de formação",
    );
  });

  it("cria uma trilha local", async () => {
    const user = userEvent.setup();
    stubUseQuery([[listFormationTracks, []]]);
    renderPage(<FormationPage />);

    await user.click(screen.getByRole("button", { name: "Nova trilha" }));
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

  it("inscreve na trilha diocesana e agenda um encontro", async () => {
    const user = userEvent.setup();
    stubUseQuery([[listFormationTracks, [FORMATION_TRACK]]]);
    renderPage(<FormationPage />);

    expect(
      screen.getByText("Formação inicial de catequistas"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("origin-badge")).toHaveTextContent("Diocese");

    await user.click(screen.getByRole("button", { name: "Inscrever-me" }));
    expect(enrollInFormationTrack).toHaveBeenCalledWith({
      trackId: FORMATION_TRACK.id,
      workspaceId: "parish-1",
    });

    await user.click(screen.getByRole("button", { name: "Encontro" }));
    await user.type(
      screen.getByPlaceholderText("Título do encontro"),
      "Encontro 2 — Liturgia",
    );
    const when = document.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    await user.type(when, "2026-10-03T19:00");
    await user.click(screen.getByRole("button", { name: "Agendar" }));

    expect(createFormationSession).toHaveBeenCalledWith({
      trackId: FORMATION_TRACK.id,
      title: "Encontro 2 — Liturgia",
      startsAt: "2026-10-03T19:00",
    });
  });

  it("marca presença quando já inscrito", async () => {
    const user = userEvent.setup();
    stubUseQuery([[listFormationTracks, [ENROLLED_TRACK]]]);
    renderPage(<FormationPage />);

    expect(screen.getByText("Inscrito")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Marcar presença" }));
    expect(markFormationAttendance).toHaveBeenCalledWith({
      sessionId: "sess-1",
      userId: "user-coord",
      present: true,
    });
  });
});
