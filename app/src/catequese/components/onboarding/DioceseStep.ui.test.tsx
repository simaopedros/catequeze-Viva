import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DioceseStep } from "./DioceseStep";
import { useAuth } from "wasp/client/auth";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../../client/hooks/useWikidataDioceses", () => ({
  useWikidataDioceses: () => ({ dioceses: [], loading: false, error: null }),
}));

vi.mock("../../../client/analytics/marketingAnalytics", () => ({
  trackMarketingEvent: vi.fn(),
}));

function setup() {
  const onSelect = vi.fn();
  const onSkip = vi.fn();
  const onContinue = vi.fn();
  const utils = render(
    <DioceseStep
      selected={null}
      onSelect={onSelect}
      onSkip={onSkip}
      onContinue={onContinue}
    />,
  );
  return { onSelect, onSkip, onContinue, ...utils };
}

describe("DioceseStep — consulta WhatsApp para não-admin", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      data: { isAdmin: false },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAuth>);
  });

  it("não oferece criar diocese; mostra o atalho de consulta", () => {
    setup();
    expect(
      screen.queryByRole("button", { name: "diocese.create_link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "diocese.not_found_link" }),
    ).toBeInTheDocument();
  });

  it("abre WhatsApp do plano Diocese e permite continuar sem diocese", async () => {
    const user = userEvent.setup();
    const { onSkip } = setup();

    await user.click(
      screen.getByRole("button", { name: "diocese.not_found_link" }),
    );

    expect(screen.getByText("diocese.not_found_title")).toBeInTheDocument();
    expect(screen.getByText("diocese.not_found_body")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /sales_whatsapp.aria|diocese.whatsapp_cta/,
      }),
    ).toHaveAttribute("href", expect.stringContaining("wa.me/"));
    expect(screen.getByText("diocese.whatsapp_cta")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /diocese.continue_without/ }),
    );
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

describe("DioceseStep — admin da plataforma", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      data: { isAdmin: true },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAuth>);
  });

  it("mantém o formulário de criar diocese", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "diocese.create_link" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "diocese.not_found_link" }),
    ).not.toBeInTheDocument();
  });
});
