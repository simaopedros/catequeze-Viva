import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toggleSocialFollow } from "wasp/client/operations";
import { SocialFollowButton } from "./SocialFollowButton";
import { invalidateSocialFollowQueries } from "../../../client/hooks/socialQueryCache";

vi.mock("../../../client/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("../../../client/hooks/socialQueryCache", () => ({
  invalidateSocialFollowQueries: vi.fn(async () => {}),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "discovery.follow": "Seguir",
        "discovery.following": "Seguindo",
      };
      return labels[key] ?? key;
    },
  }),
}));

describe("SocialFollowButton", () => {
  beforeEach(() => {
    vi.mocked(toggleSocialFollow).mockReset();
    vi.mocked(invalidateSocialFollowQueries).mockReset();
  });

  it("atualiza o rótulo quando o autor ou o estado inicial mudam", () => {
    const { rerender } = render(
      <SocialFollowButton
        authorId="ana"
        authorName="Ana"
        initiallyFollowing={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();

    rerender(
      <SocialFollowButton
        authorId="joao"
        authorName="João"
        initiallyFollowing
      />,
    );

    expect(
      screen.getByRole("button", { name: "Seguindo" }),
    ).toBeInTheDocument();
  });

  it("atualiza o feed depois de seguir", async () => {
    vi.mocked(toggleSocialFollow).mockResolvedValue({ following: true } as any);
    const user = userEvent.setup();
    render(
      <SocialFollowButton
        authorId="ana"
        authorName="Ana"
        initiallyFollowing={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Seguir" }));

    expect(toggleSocialFollow).toHaveBeenCalledWith({ authorId: "ana" });
    expect(invalidateSocialFollowQueries).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Seguindo" })).toBeInTheDocument();
  });
});
