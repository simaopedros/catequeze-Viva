import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import {
  PersonalBillingActive,
  usageBarPercent,
} from "./PersonalBillingActive";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (!opts) return key;
      const parts = Object.entries(opts)
        .filter(([k]) => k !== "defaultValue" && k !== "ns")
        .map(([k, v]) => `${k}=${v}`);
      return parts.length ? `${key}|${parts.join("|")}` : key;
    },
  }),
}));

vi.mock("../../client/analytics/marketingAnalytics", () => ({
  trackMarketingEvent: vi.fn(),
}));

vi.mock("./OrganizeParishCard", () => ({
  OrganizeParishCard: ({ variant }: { variant?: string }) => (
    <div data-testid="organize-parish-card" data-variant={variant} />
  ),
}));

const features = [
  "Até 3 turmas",
  "150 catequizandos no total",
  "Presença e calendário litúrgico",
];

function renderActive(
  override: Partial<ComponentProps<typeof PersonalBillingActive>> = {},
) {
  const onManage = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <PersonalBillingActive
      workspaceName="Meu Espaço Pessoal"
      planName="Plano Catequista"
      features={features}
      monthlyCents={990}
      annualCents={9900}
      billedAnnually
      classesUsed={1}
      catechumensUsed={22}
      maxClasses={3}
      maxCatechumens={150}
      onManage={onManage}
      manageLoading={false}
      onCancel={onCancel}
      cancelling={false}
      cancelScheduled={false}
      annualSavingsLabel="R$ 19,80"
      error={null}
      {...override}
    />,
  );
  return { onManage, onCancel, ...utils };
}

describe("usageBarPercent", () => {
  it("maps 1 of 3 classes to about a third", () => {
    expect(usageBarPercent(1, 3)).toBeCloseTo(33.33, 1);
    expect(usageBarPercent(22, 150)).toBeCloseTo(14.67, 1);
    expect(usageBarPercent(0, 0)).toBe(0);
  });
});

describe("PersonalBillingActive", () => {
  it("shows an active panel, current plan and parish as the next step", () => {
    renderActive();

    expect(screen.getByTestId("personal-billing-active")).toBeInTheDocument();
    expect(screen.getByTestId("personal-active-hero")).toHaveTextContent(
      "Plano Catequista",
    );
    expect(screen.getByTestId("personal-active-badge")).toBeInTheDocument();
    expect(screen.getByTestId("personal-active-plan")).toHaveTextContent(
      "R$ 8,25",
    );
    expect(screen.getByTestId("personal-active-plan")).toHaveTextContent(
      "R$ 99",
    );
    expect(screen.getByTestId("organize-parish-card")).toHaveAttribute(
      "data-variant",
      "upsell",
    );
    expect(screen.queryByTestId("billing-dual-scopes")).not.toBeInTheDocument();
    expect(screen.queryByText("available_plans")).not.toBeInTheDocument();
    expect(screen.getByTestId("personal-active-history")).toBeInTheDocument();
    expect(screen.getByTestId("personal-active-support")).toBeInTheDocument();

    const manage = screen.getByTestId("personal-active-manage");
    const cancel = screen.getByTestId("personal-active-cancel");
    expect(manage.tagName).toBe("BUTTON");
    expect(cancel.className).toMatch(/text-xs/);
  });

  it("keeps manage as the primary action and cancel as a quiet link", async () => {
    const user = userEvent.setup();
    const { onManage, onCancel } = renderActive();

    await user.click(screen.getByTestId("personal-active-manage"));
    expect(onManage).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("personal-active-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
