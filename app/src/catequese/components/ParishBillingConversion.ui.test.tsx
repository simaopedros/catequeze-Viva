import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { ParishBillingConversion } from "./ParishBillingConversion";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (!opts) return key;
      const parts = Object.entries(opts)
        .filter(([k]) => k !== "defaultValue")
        .map(([k, v]) => `${k}=${v}`);
      return parts.length ? `${key}|${parts.join("|")}` : key;
    },
  }),
}));

vi.mock("../../client/analytics/marketingAnalytics", () => ({
  trackMarketingEvent: vi.fn(),
}));

const features = [
  "Turmas e equipe ilimitadas",
  "Catequizandos ilimitados",
  "Espaço institucional da paróquia",
];

function renderConversion(
  override: Partial<ComponentProps<typeof ParishBillingConversion>> = {},
) {
  const onSubscribe = vi.fn();
  const onIntervalChange = vi.fn();
  const utils = render(
    <ParishBillingConversion
      parishName="Paróquia Jesus Cristo"
      isTrial
      trialDaysLeft={7}
      trialEndsLabel="10 de setembro de 2026"
      classesUsed={1}
      catechumensUsed={22}
      planName="Plano Paróquia"
      features={features}
      monthlyCents={9900}
      annualCents={99000}
      defaultInterval="annual"
      onIntervalChange={onIntervalChange}
      onSubscribe={onSubscribe}
      upgrading={false}
      error={null}
      {...override}
    />,
  );
  return { onSubscribe, onIntervalChange, ...utils };
}

describe("ParishBillingConversion", () => {
  it("leads with status, usage contrast, price and a single subscribe CTA", () => {
    renderConversion();

    const page = screen.getByTestId("parish-billing-conversion");
    expect(page).toBeInTheDocument();
    expect(screen.getByTestId("parish-conversion-hero")).toHaveTextContent(
      "Paróquia Jesus Cristo",
    );
    expect(screen.getByTestId("parish-conversion-hero")).toHaveTextContent(
      "10 de setembro de 2026",
    );
    expect(screen.getByTestId("parish-conversion-usage")).toBeInTheDocument();
    expect(screen.getByTestId("parish-conversion-plan")).toHaveTextContent(
      "R$ 82,50",
    );
    expect(screen.getByTestId("parish-conversion-plan")).toHaveTextContent(
      "R$ 990",
    );
    expect(screen.getByTestId("parish-conversion-plan")).toHaveTextContent(
      "R$ 198",
    );

    const ctas = screen.getAllByTestId("billing-offer-cta");
    expect(ctas).toHaveLength(1);
    expect(screen.queryByTestId("billing-dual-scopes")).not.toBeInTheDocument();
    expect(screen.queryByText("payment_history")).not.toBeInTheDocument();
    expect(screen.getByTestId("parish-conversion-diocese")).toBeInTheDocument();
    expect(screen.getByTestId("parish-conversion-support")).toBeInTheDocument();
  });

  it("subscribes annually by default and monthly after toggling", async () => {
    const user = userEvent.setup();
    const { onSubscribe, onIntervalChange } = renderConversion();

    await user.click(screen.getByTestId("billing-offer-cta"));
    expect(onSubscribe).toHaveBeenCalledWith("annual");

    await user.click(screen.getByTestId("billing-interval-monthly"));
    expect(onIntervalChange).toHaveBeenCalledWith("monthly");
    expect(screen.getByTestId("parish-conversion-plan")).toHaveTextContent(
      "R$ 99",
    );

    await user.click(screen.getByTestId("billing-offer-cta"));
    expect(onSubscribe).toHaveBeenLastCalledWith("monthly");
  });

  it("renders Catequista conversion without diocese sales copy", () => {
    renderConversion({
      variant: "catechist",
      parishName: "Meu espaço pessoal",
      planName: "Plano Catequista",
      planClassLimit: 3,
      planCatechumenLimit: 150,
    });

    expect(
      screen.getByTestId("personal-billing-conversion"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("personal-conversion-plan")).toHaveTextContent(
      "R$ 82,50",
    );
    expect(
      screen.queryByTestId("parish-conversion-diocese"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId("billing-offer-cta")).toHaveLength(1);
  });
});
