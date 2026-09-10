import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SocialShareEmbed } from "./SocialShareEmbed";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "nativeShare.kind.verse": "Versículo",
        "nativeShare.kind.catechism": "Catecismo",
        "nativeShare.kind.directory": "Diretório",
        "nativeShare.kind.document": "Biblioteca",
        "nativeShare.kind.ai": "Assistência editorial",
      };
      return labels[key] ?? key;
    },
  }),
}));

describe("SocialShareEmbed", () => {
  it("renderiza o card nativo com deep-link e texto que não estoura o layout", () => {
    render(
      <MemoryRouter>
        <SocialShareEmbed
          share={{
            kind: "VERSE",
            title: "João 3:16",
            subtitle: "Jo",
            excerpt: "Porque Deus amou o mundo de tal maneira",
            href: "/app/bible?book=joao&chapter=3&verse=16",
            sourceLabel: "Bíblia",
          }}
        />
      </MemoryRouter>,
    );

    const card = screen.getByRole("link");
    expect(card).toHaveAttribute(
      "href",
      "/app/bible?book=joao&chapter=3&verse=16",
    );
    expect(card).toHaveClass("overflow-hidden");
    expect(screen.getByText("Versículo")).toBeInTheDocument();
    expect(screen.getByText("João 3:16")).toHaveClass("truncate");
  });

  it("usa o rótulo traduzido em vez do sourceLabel gravado", () => {
    render(
      <MemoryRouter>
        <SocialShareEmbed
          share={{
            kind: "DOCUMENT",
            title: "Encontro sobre o Batismo",
            excerpt: "A água é sinal.",
            href: "/app/content-library/doc-1",
            sourceLabel: "Biblioteca",
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Biblioteca")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/app/content-library/doc-1",
    );
  });

  it.each([
    ["CATECHISM", "CIC 1210", "/app/catechism?entry=1210", "Catecismo"],
    ["DIRECTORY", "A iniciação cristã", "/app/directory?entry=42", "Diretório"],
    ["AI_ARTIFACT", "Rascunho editorial", "/app/content-library/ai-1", "Assistência editorial"],
  ] as const)("card %s aponta para a origem", (kind, title, href, label) => {
    render(
      <MemoryRouter>
        <SocialShareEmbed
          share={{
            kind,
            title,
            excerpt: "Texto de apoio",
            href,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", href);
  });
});
