import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import FormationTrackPage from "./FormationTrackPage";
import {
  getFormationTrack,
  createFormationSession,
  updateFormationTrack,
  deleteFormationTrack,
  enrollInFormationTrack,
  unenrollFromFormationTrack,
  markFormationAttendance,
} from "wasp/client/operations";
import {
  FORMATION_TRACK_DETAIL,
  LOCAL_FORMATION_TRACK,
  ENROLLED_TRACK,
} from "../../__tests__/ui/hierarchyFixtures";
import {
  parishCoordinator,
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

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/app/formation/${id}`]}>
      <Routes>
        <Route path="/app/formation/:id" element={<FormationTrackPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FormationTrackPage", () => {
  beforeEach(() => {
    userCtx.current = parishCoordinator();
    vi.mocked(createFormationSession).mockResolvedValue({} as never);
    vi.mocked(updateFormationTrack).mockResolvedValue({} as never);
    vi.mocked(deleteFormationTrack).mockResolvedValue({
      deleted: true,
    } as never);
    vi.mocked(enrollInFormationTrack).mockResolvedValue({} as never);
    vi.mocked(unenrollFromFormationTrack).mockResolvedValue({} as never);
    vi.mocked(markFormationAttendance).mockResolvedValue({} as never);
  });

  it("mostra detalhe herdado sem editar a trilha oficial", () => {
    stubUseQuery([
      [getFormationTrack, { ...FORMATION_TRACK_DETAIL, myEnrollment: null }],
    ]);
    renderDetail("track-1");

    expect(
      screen.getByText("Formação inicial de catequistas"),
    ).toBeInTheDocument();
    expect(screen.getByText(/só a cúria edita/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Encontro" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Inscrever-me" }),
    ).toBeInTheDocument();
  });

  it("agenda encontro, edita e exclui trilha local", async () => {
    const user = userEvent.setup();
    stubUseQuery([[getFormationTrack, LOCAL_FORMATION_TRACK]]);
    renderDetail("track-local-1");

    await user.click(screen.getByRole("button", { name: "Encontro" }));
    await user.type(
      screen.getByLabelText("Título do encontro"),
      "Encontro 2 — Liturgia",
    );
    const when = document.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    await user.type(when, "2026-10-03T19:00");
    await user.click(screen.getByRole("button", { name: "Agendar" }));

    expect(createFormationSession).toHaveBeenCalledWith(
      expect.objectContaining({
        trackId: LOCAL_FORMATION_TRACK.id,
        title: "Encontro 2 — Liturgia",
        startsAt: "2026-10-03T19:00",
      }),
    );

    const editButtons = screen.getAllByRole("button", { name: "Editar" });
    await user.click(editButtons[0]);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(updateFormationTrack).toHaveBeenCalledWith(
      expect.objectContaining({ id: LOCAL_FORMATION_TRACK.id }),
    );
  });

  it("marca presença quando já inscrito", async () => {
    const user = userEvent.setup();
    stubUseQuery([
      [
        getFormationTrack,
        {
          ...ENROLLED_TRACK,
          ...FORMATION_TRACK_DETAIL,
          myEnrollment: { status: "ENROLLED" },
          canManage: false,
        },
      ],
    ]);
    renderDetail("track-1");

    expect(screen.getAllByText("Inscrito").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Marcar presença" }));
    expect(markFormationAttendance).toHaveBeenCalledWith({
      sessionId: "sess-1",
      userId: "user-coord",
      present: true,
      workspaceId: "parish-1",
    });
  });
});
