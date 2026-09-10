import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { CatechismEntryCard } from "./CatechismEntryCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { number?: number; question?: string }) => {
      const labels: Record<string, string> = {
        "nativeShare.action": "Partilhar na Comunidade",
        "nativeShare.dialogTitle": "Partilhar na Comunidade",
        "nativeShare.dialogDescription": "O conteúdo fica anexado à publicação.",
        "share.catechismBody": `CIC ${opts?.number}: ${opts?.question}`,
        "upsell.anonymousTitle": "Entre para participar",
        "upsell.login": "Entrar",
      };
      return labels[key] ?? key;
    },
  }),
}));

const entry = {
  id: "c1",
  number: 1210,
  question: "O que é o Batismo?",
  answer: "É o sacramento da nova vida.",
};

describe("CatechismEntryCard", () => {
  it("só oferece partilha nativa com a entrada aberta", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <CatechismEntryCard entry={entry} expanded={false} onToggle={onToggle} />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("share-to-community")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /o que é o batismo/i }));
    expect(onToggle).toHaveBeenCalled();

    rerender(
      <MemoryRouter>
        <CatechismEntryCard entry={entry} expanded onToggle={onToggle} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("share-to-community")).toBeInTheDocument();
    await user.click(screen.getByTestId("share-to-community"));
    expect(
      screen.getByRole("heading", { name: "Partilhar na Comunidade" }),
    ).toBeInTheDocument();
  });
});
