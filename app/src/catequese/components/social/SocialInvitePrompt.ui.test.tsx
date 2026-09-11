// @ts-nocheck — o tsc do SDK Wasp também vê os *.ui.test.tsx.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuery, getMySocialProfile } from "wasp/client/operations";
import { toast } from "../../../client/hooks/use-toast";
import { SOCIAL_INVITE_STORAGE_KEY } from "../../../shared/socialInvitePrompt";
import { SocialInvitePrompt } from "./SocialInvitePrompt";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "invitePrompt.title": "Traga alguém para a Comunidade",
        "invitePrompt.description":
          "A fé cresce em companhia. Envie o seu link a um amigo ou familiar.",
        "invitePrompt.copyLink": "Copiar link",
        "invitePrompt.whatsapp": "WhatsApp",
        "invitePrompt.share": "Partilhar",
        "invitePrompt.dismiss": "Agora não",
        "invitePrompt.copied": "Link copiado",
        "invitePrompt.message": "Venha participar da Comunidade comigo:",
        title: "Comunidade",
      };
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("../../../client/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("../../../client/hooks/useUserContext", () => ({
  useUserContext: () => ({
    needsOnboarding: false,
    isLoading: false,
  }),
}));

const lonelyProfile = {
  handle: "ana_catequista",
  followerCount: 0,
  followingCount: 0,
  banned: false,
};

describe("SocialInvitePrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useQuery).mockImplementation(((query: unknown) => {
      if (query === getMySocialProfile) {
        return {
          data: lonelyProfile,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }) as typeof useQuery);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("mostra o convite quando a pessoa ainda não tem ligações", () => {
    render(<SocialInvitePrompt />);

    expect(screen.getByTestId("social-invite-prompt")).toBeInTheDocument();
    expect(
      screen.getByText("Traga alguém para a Comunidade"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copiar link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "WhatsApp" }),
    ).toBeInTheDocument();
  });

  it("esconde o cartão depois de dispensar", async () => {
    const user = userEvent.setup();
    render(<SocialInvitePrompt />);

    await user.click(screen.getByRole("button", { name: "Agora não" }));

    expect(
      screen.queryByTestId("social-invite-prompt"),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(SOCIAL_INVITE_STORAGE_KEY)).toContain(
      "timestamp",
    );
  });

  it("copia o link do perfil e inicia o cooldown", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<SocialInvitePrompt />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/u/ana_catequista`,
      );
    });
    expect(toast).toHaveBeenCalledWith({ title: "Link copiado" });
    expect(
      screen.queryByTestId("social-invite-prompt"),
    ).not.toBeInTheDocument();
  });

  it("não mostra o convite quando já há seguidores", () => {
    vi.mocked(useQuery).mockImplementation(((query: unknown) => {
      if (query === getMySocialProfile) {
        return {
          data: { ...lonelyProfile, followerCount: 3 },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return {
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }) as typeof useQuery);

    render(<SocialInvitePrompt />);
    expect(
      screen.queryByTestId("social-invite-prompt"),
    ).not.toBeInTheDocument();
  });
});
