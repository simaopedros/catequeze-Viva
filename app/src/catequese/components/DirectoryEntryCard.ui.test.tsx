import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { DirectoryEntryCard } from "./DirectoryEntryCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "nativeShare.action": "Partilhar na Comunidade",
        "nativeShare.dialogTitle": "Partilhar na Comunidade",
        "nativeShare.dialogDescription": "O conteúdo fica anexado à publicação.",
        "share.directoryBody": "Diretório",
        "upsell.anonymousTitle": "Entre para participar",
        "upsell.login": "Entrar",
      };
      return labels[key] ?? key;
    },
  }),
}));

const entry = {
  id: "d1",
  number: 42,
  title: "A iniciação cristã",
  content: "O Diretório descreve o caminho.",
};

describe("DirectoryEntryCard", () => {
  it("só oferece partilha nativa com o parágrafo aberto", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MemoryRouter>
        <DirectoryEntryCard entry={entry} expanded={false} onToggle={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("share-to-community")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <DirectoryEntryCard entry={entry} expanded onToggle={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("share-to-community")).toBeInTheDocument();
    await user.click(screen.getByTestId("share-to-community"));
    expect(
      screen.getByRole("heading", { name: "Partilhar na Comunidade" }),
    ).toBeInTheDocument();
  });
});
