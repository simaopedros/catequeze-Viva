import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DioceseDealSummary } from "./DioceseDealSummary";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (!opts) return key;
      const parts = Object.entries(opts)
        .filter(([k]) => k !== "defaultValue")
        .map(([k, v]) => `${k}=${v}`);
      return parts.length ? `${key}|${parts.join("|")}` : key;
    },
    i18n: { language: "pt-BR" },
  }),
}));

describe("DioceseDealSummary", () => {
  it("shows used vs allowed parishes and hides commercial internals", () => {
    render(
      <DioceseDealSummary
        dioceseName="Diocese de Teste"
        status="ACTIVE"
        covering
        parishesUsed={3}
        maxParishes={10}
        readOnly
      />,
    );

    const summary = screen.getByTestId("diocese-deal-summary");
    expect(summary).toHaveAttribute("data-status", "ACTIVE");
    expect(summary).toHaveAttribute("data-covering", "true");
    expect(summary).toHaveTextContent("Diocese de Teste");
    expect(summary).toHaveTextContent("deal.parishes_used|used=3|max=10");
    expect(summary).not.toHaveTextContent(/PIX|R\$|stripe|checkout/i);
  });

  it("shows paused copy when the deal is not covering", () => {
    render(
      <DioceseDealSummary
        dioceseName="Diocese de Teste"
        status="SUSPENDED"
        covering={false}
        parishesUsed={3}
        maxParishes={10}
        readOnly
      />,
    );

    expect(screen.getByTestId("diocese-deal-summary")).toHaveAttribute(
      "data-covering",
      "false",
    );
    expect(screen.getByText("deal.paused_desc")).toBeInTheDocument();
  });
});
