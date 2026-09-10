import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { useAuth } from "wasp/client/auth";
import { ShareToCommunityButton } from "./ShareToCommunityButton";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "nativeShare.action": "Partilhar na Comunidade",
        "nativeShare.dialogTitle": "Partilhar na Comunidade",
        "nativeShare.dialogDescription":
          "O conteúdo fica anexado à publicação com um atalho de volta à origem.",
        "share.toCommunity": "Levar à Comunidade",
        "upsell.anonymousTitle": "Entre para participar",
        "upsell.anonymousDescription": "Crie a sua conta para reagir, comentar e publicar.",
        "upsell.login": "Entrar",
        "feed.loading": "A carregar",
        "close": "Fechar",
      };
      return labels[key] ?? key;
    },
  }),
}));

describe("ShareToCommunityButton", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);
  });

  it("abre o diálogo nativo e convida a entrar quando não há sessão", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ShareToCommunityButton
          draft={{ kind: "VERSE", sourceId: "verse-1" }}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByTestId("share-to-community");
    expect(trigger).toHaveAccessibleName("Partilhar na Comunidade");
    await user.click(trigger);

    expect(
      screen.getByRole("heading", { name: "Partilhar na Comunidade" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Entre para participar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("no fluxo de texto aponta para o composer da Comunidade", () => {
    render(
      <MemoryRouter>
        <ShareToCommunityButton
          body="Palavra de hoje"
          topic="biblia"
          source="bible"
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("share-to-community")).toHaveAttribute(
      "href",
      "/app/comunidade?share=1&body=Palavra+de+hoje&topic=biblia&from=bible",
    );
  });
});
