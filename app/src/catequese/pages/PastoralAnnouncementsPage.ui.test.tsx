import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PastoralAnnouncementsPage from "./PastoralAnnouncementsPage";
import {
  listPastoralAnnouncements,
  createPastoralAnnouncement,
  publishPastoralAnnouncement,
  acknowledgePastoralAnnouncement,
  republishPastoralAnnouncement,
} from "wasp/client/operations";
import {
  DRAFT_ANNOUNCEMENT,
  PUBLISHED_ANNOUNCEMENT,
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

vi.mock("../../client/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("PastoralAnnouncementsPage", () => {
  beforeEach(() => {
    userCtx.current = parishCoordinator();
    vi.mocked(createPastoralAnnouncement).mockResolvedValue({
      id: "new",
    } as never);
    vi.mocked(publishPastoralAnnouncement).mockResolvedValue({} as never);
    vi.mocked(acknowledgePastoralAnnouncement).mockResolvedValue({} as never);
    vi.mocked(republishPastoralAnnouncement).mockResolvedValue({} as never);
  });

  it("mostra estado vazio", () => {
    stubUseQuery([[listPastoralAnnouncements, []]]);
    renderPage(<PastoralAnnouncementsPage />);
    expect(screen.getByTestId("empty-announcements")).toHaveTextContent(
      "Nenhum comunicado",
    );
  });

  it("cria um comunicado em rascunho", async () => {
    const user = userEvent.setup();
    stubUseQuery([[listPastoralAnnouncements, []]]);
    renderPage(<PastoralAnnouncementsPage />);

    await user.click(screen.getByRole("button", { name: "Novo comunicado" }));
    await user.type(screen.getByLabelText("Título"), "Retiro de catequistas");
    await user.type(
      screen.getByPlaceholderText("Texto do ofício…"),
      "Sábado na cúria, 8h.",
    );
    await user.click(screen.getByRole("button", { name: "Criar" }));

    expect(createPastoralAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "parish-1",
        title: "Retiro de catequistas",
        body: "Sábado na cúria, 8h.",
        requireAck: true,
      }),
    );
  });

  it("publica rascunho local, dá ciência e republica o ofício herdado", async () => {
    const user = userEvent.setup();
    stubUseQuery([
      [listPastoralAnnouncements, [PUBLISHED_ANNOUNCEMENT, DRAFT_ANNOUNCEMENT]],
    ]);
    renderPage(<PastoralAnnouncementsPage />);

    expect(screen.getByText("Início da catequese 2026")).toBeInTheDocument();
    expect(screen.getByText("3 ciências")).toBeInTheDocument();
    expect(screen.getAllByTestId("origin-badge").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Publicar" }));
    expect(publishPastoralAnnouncement).toHaveBeenCalledWith({
      id: DRAFT_ANNOUNCEMENT.id,
    });

    await user.click(screen.getByRole("button", { name: "Dar ciência" }));
    expect(acknowledgePastoralAnnouncement).toHaveBeenCalledWith({
      id: PUBLISHED_ANNOUNCEMENT.id,
    });

    await user.click(screen.getByRole("button", { name: "Republicar" }));
    expect(republishPastoralAnnouncement).toHaveBeenCalledWith({
      id: PUBLISHED_ANNOUNCEMENT.id,
      workspaceId: "parish-1",
    });
  });
});
