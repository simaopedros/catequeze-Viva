import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SocialPostCard, type SocialPostItem } from "./SocialPostCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "post.showMore": "Ver mais",
        "post.showLess": "Ver menos",
        "post.delete": "Apagar",
        "post.report": "Denunciar",
        "discovery.block": "Bloquear",
        "feed.openPost": "Abrir publicação",
        "reactions.AMEM": "Amém",
        "comments.title": "Comentários",
        "nativeShare.kind.verse": "Versículo",
      };
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("../../../i18n/useLocale", () => ({
  useLocale: () => ({ currentLocale: "pt-BR" }),
}));

vi.mock("../../../i18n/format", () => ({
  formatRelativeTime: () => "agora",
}));

vi.mock("../../../client/hooks/useConfirm", () => ({
  useConfirm: () => ({ confirm: vi.fn(), confirmDialog: null }),
}));

vi.mock("../../../client/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

function post(overrides: Partial<SocialPostItem> = {}): SocialPostItem {
  return {
    id: "post-1",
    slug: "paz-e-bem",
    kind: "TEXT",
    status: "PUBLISHED",
    body: "Paz e bem\n" + "a".repeat(500),
    createdAt: "2026-09-10T00:00:00.000Z",
    publishedAt: "2026-09-10T00:00:00.000Z",
    reactionCount: 0,
    commentCount: 0,
    shareCount: 0,
    author: {
      id: "author-1",
      displayName: "Ana Catequista",
      avatarUrl: null,
      socialHandle: "ana_catequista",
    },
    parish: null,
    share: {
      kind: "VERSE",
      title: "João 3:16",
      excerpt: "Porque Deus amou o mundo",
      href: "/app/bible?book=joao&chapter=3&verse=16",
    },
    media: [],
    topics: [{ slug: "biblia", name: "Bíblia" }],
    viewerReaction: null,
    isOwn: false,
    ...overrides,
  };
}

describe("SocialPostCard", () => {
  it("colapsa texto longo e expande ao pedir Ver mais", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/app/comunidade"]}>
        <SocialPostCard post={post()} canInteract={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Ver mais" })).toBeInTheDocument();
    expect(screen.queryByText("a".repeat(500))).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver mais" }));
    expect(screen.getByRole("button", { name: "Ver menos" })).toBeInTheDocument();
    expect(screen.getByText("a".repeat(500))).toBeInTheDocument();
  });

  it("mantém o @ do autor no shell do app e o card de partilha com deep-link", () => {
    render(
      <MemoryRouter initialEntries={["/app/comunidade"]}>
        <SocialPostCard post={post()} canInteract={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Ana Catequista" })).toHaveAttribute(
      "href",
      "/app/comunidade/u/ana_catequista",
    );
    expect(screen.getByRole("link", { name: /joão 3:16/i })).toHaveAttribute(
      "href",
      "/app/bible?book=joao&chapter=3&verse=16",
    );
    expect(screen.getByRole("link", { name: "Bíblia" })).toHaveAttribute(
      "href",
      "/app/comunidade/t/biblia",
    );
    expect(screen.getByRole("link", { name: "Abrir publicação" })).toHaveAttribute(
      "href",
      "/app/comunidade/p/paz-e-bem",
    );
  });

  it("no feed público mantém tema e permalink fora do shell", () => {
    render(
      <MemoryRouter initialEntries={["/comunidade"]}>
        <SocialPostCard post={post()} canInteract={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Bíblia" })).toHaveAttribute(
      "href",
      "/comunidade/t/biblia",
    );
    expect(screen.getByRole("link", { name: "Abrir publicação" })).toHaveAttribute(
      "href",
      "/comunidade/p/paz-e-bem",
    );
  });
});
