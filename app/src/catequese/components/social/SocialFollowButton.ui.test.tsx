import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SocialFollowButton } from "./SocialFollowButton";

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
});
