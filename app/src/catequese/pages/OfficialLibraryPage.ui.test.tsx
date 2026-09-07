import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OfficialLibraryPage from "./OfficialLibraryPage";
import {
  listOfficialResources,
  createOfficialResource,
  publishOfficialResource,
  adoptOfficialResource,
  updateOfficialResource,
  deleteOfficialResource,
} from "wasp/client/operations";
import {
  ADAPTED_STALE_RESOURCE,
  DIOCESE_RESOURCE,
  DRAFT_PARISH_RESOURCE,
  SUGGESTED_RESOURCE,
} from "../../__tests__/ui/hierarchyFixtures";
import {
  leadCatechist,
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

describe("OfficialLibraryPage", () => {
  beforeEach(() => {
    userCtx.current = parishCoordinator();
    vi.mocked(createOfficialResource).mockResolvedValue({ id: "new" } as never);
    vi.mocked(publishOfficialResource).mockResolvedValue({} as never);
    vi.mocked(adoptOfficialResource).mockResolvedValue({} as never);
    vi.mocked(updateOfficialResource).mockResolvedValue({} as never);
    vi.mocked(deleteOfficialResource).mockResolvedValue({
      deleted: true,
      archived: false,
    } as never);
  });

  it("mostra estado vazio quando não há recursos", () => {
    stubUseQuery([[listOfficialResources, []]]);
    renderPage(<OfficialLibraryPage />);
    expect(screen.getByTestId("empty-official-library")).toHaveTextContent(
      "Nenhum recurso oficial",
    );
    expect(
      screen.getByRole("button", { name: "Novo recurso" }),
    ).toBeInTheDocument();
  });

  it("lista origem, tipo e permite publicar rascunho local", async () => {
    const user = userEvent.setup();
    stubUseQuery([
      [listOfficialResources, [DIOCESE_RESOURCE, DRAFT_PARISH_RESOURCE]],
    ]);
    renderPage(<OfficialLibraryPage />);

    expect(screen.getByText("Diretório diocesano 2026")).toBeInTheDocument();
    expect(screen.getByText("Regulamento interno")).toBeInTheDocument();
    const badges = screen.getAllByTestId("origin-badge");
    expect(badges.some((b) => b.textContent?.includes("Diocese"))).toBe(true);
    expect(badges.some((b) => b.textContent?.includes("Paróquia"))).toBe(true);

    await user.click(screen.getByRole("button", { name: "Publicar" }));
    expect(publishOfficialResource).toHaveBeenCalledWith({
      id: DRAFT_PARISH_RESOURCE.id,
    });
  });

  it("cria um rascunho a partir do formulário", async () => {
    const user = userEvent.setup();
    stubUseQuery([[listOfficialResources, []]]);
    renderPage(<OfficialLibraryPage />);

    await user.click(screen.getByRole("button", { name: "Novo recurso" }));
    await user.type(screen.getByLabelText("Título"), "Circular de matrículas");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    expect(createOfficialResource).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "parish-1",
        title: "Circular de matrículas",
        kind: "DIRECTORY",
        inheritancePolicy: "SUGGESTED",
      }),
    );
  });

  it("edita e exclui um recurso local da paróquia", async () => {
    const user = userEvent.setup();
    stubUseQuery([[listOfficialResources, [DRAFT_PARISH_RESOURCE]]]);
    renderPage(<OfficialLibraryPage />);

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const title = screen.getByLabelText("Título");
    await user.clear(title);
    await user.type(title, "Regulamento interno 2026");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(updateOfficialResource).toHaveBeenCalledWith(
      expect.objectContaining({
        id: DRAFT_PARISH_RESOURCE.id,
        title: "Regulamento interno 2026",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    const confirms = screen.getAllByRole("button", { name: "Excluir" });
    await user.click(confirms[confirms.length - 1]);
    expect(deleteOfficialResource).toHaveBeenCalledWith({
      id: DRAFT_PARISH_RESOURCE.id,
      workspaceId: "parish-1",
    });
  });

  it("mostra anexo herdado para download e esconde edição em LOCKED", () => {
    stubUseQuery([[listOfficialResources, [DIOCESE_RESOURCE]]]);
    renderPage(<OfficialLibraryPage />);

    expect(screen.getByText("diretorio-2026.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Baixar" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Editar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Anexar arquivo" }),
    ).not.toBeInTheDocument();
  });

  it("adota, adapta e ignora um subsídio sugerido", async () => {
    const user = userEvent.setup();
    stubUseQuery([[listOfficialResources, [SUGGESTED_RESOURCE]]]);
    renderPage(<OfficialLibraryPage />);

    await user.click(screen.getByRole("button", { name: "Adotar" }));
    expect(adoptOfficialResource).toHaveBeenCalledWith({
      id: SUGGESTED_RESOURCE.id,
      workspaceId: "parish-1",
      status: "INHERITED",
    });

    await user.click(screen.getByRole("button", { name: "Adaptar" }));
    expect(adoptOfficialResource).toHaveBeenCalledWith({
      id: SUGGESTED_RESOURCE.id,
      workspaceId: "parish-1",
      status: "ADAPTED",
    });

    await user.click(screen.getByRole("button", { name: "Ignorar" }));
    expect(adoptOfficialResource).toHaveBeenCalledWith({
      id: SUGGESTED_RESOURCE.id,
      workspaceId: "parish-1",
      status: "DISMISSED",
    });
  });

  it("alerta versão nova quando a cópia adaptada ficou para trás", () => {
    stubUseQuery([[listOfficialResources, [ADAPTED_STALE_RESOURCE]]]);
    renderPage(<OfficialLibraryPage />);
    expect(
      screen.getByText(
        "Há uma versão nova do original. A cópia adaptada permanece congelada.",
      ),
    ).toBeInTheDocument();
  });

  it("esconde publicação do catequista e ainda oferece adoção", () => {
    userCtx.current = leadCatechist();
    stubUseQuery([[listOfficialResources, [SUGGESTED_RESOURCE]]]);
    renderPage(<OfficialLibraryPage />);

    expect(
      screen.queryByRole("button", { name: "Novo recurso" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adotar" })).toBeInTheDocument();
  });
});
