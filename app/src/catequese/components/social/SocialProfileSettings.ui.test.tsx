import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  useQuery,
  getMySocialProfile,
  listMySocialBlocks,
} from "wasp/client/operations";
import { SocialProfileSettings } from "./SocialProfileSettings";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        social_profile: "Perfil na Comunidade",
        social_profile_desc: "Seu @ público, bio e foto aparecem nas partilhas e no feed.",
        social_handle: "Nome de usuário (@)",
        social_bio: "Bio",
        social_website: "Link pessoal",
        social_change_avatar: "Trocar foto",
        social_save: "Salvar perfil público",
        social_copy_link: "Copiar link do perfil",
        social_handle_required: "Defina um @ para copiar o link.",
        social_blocked: "Contas bloqueadas",
        social_unblock: "Desbloquear",
        saved: "Guardado",
        "profile.linkCopied": "Link do perfil copiado",
      };
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("../../../client/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("SocialProfileSettings", () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockImplementation(((query: unknown) => {
      if (query === getMySocialProfile) {
        return {
          data: {
            handle: "ana_catequista",
            bio: "Catequista paroquial",
            websiteUrl: "https://paroquia.org",
            avatarUrl: null,
            displayName: "Ana",
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (query === listMySocialBlocks) {
        return {
          data: {
            items: [{ id: "user-2", displayName: "João", handle: "joao" }],
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      return { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
    }) as typeof useQuery);
  });

  it("mostra @, bio, website, copiar link e a lista de bloqueados", () => {
    render(<SocialProfileSettings />);

    expect(screen.getByLabelText("Nome de usuário (@)")).toHaveValue(
      "ana_catequista",
    );
    expect(screen.getByLabelText("Bio")).toHaveValue("Catequista paroquial");
    expect(screen.getByLabelText("Link pessoal")).toHaveValue(
      "https://paroquia.org",
    );
    expect(
      screen.getByRole("button", { name: "Copiar link do perfil" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Contas bloqueadas")).toBeInTheDocument();
    expect(screen.getByText(/João/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desbloquear" })).toBeInTheDocument();
  });
});
