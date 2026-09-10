import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManagedBillingNotice } from "./ManagedBillingNotice";

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

describe("ManagedBillingNotice", () => {
  it("shows who manages the workspace without plan or price copy", () => {
    render(
      <ManagedBillingNotice
        workspaceName="Paróquia Jesus Cristo"
        roleLabel="Catequista auxiliar"
        managerName="Maria Coordenadora"
      />,
    );

    expect(screen.getByTestId("managed-billing-notice")).toHaveAttribute(
      "data-variant",
      "collaborator",
    );
    expect(screen.getByTestId("managed-billing-hero")).toHaveTextContent(
      "Paróquia Jesus Cristo",
    );
    expect(screen.getByTestId("managed-billing-who")).toHaveTextContent(
      "managed_notice.manager_person|name=Maria Coordenadora",
    );
    expect(screen.getByTestId("managed-billing-who")).toHaveTextContent(
      "Catequista auxiliar",
    );
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("billing-plan-catalog"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("billing-dual-scopes")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("managed-billing-diocese-sales"),
    ).not.toBeInTheDocument();
  });

  it("names the diocese for covered workspaces and skips collaborator role", () => {
    render(
      <ManagedBillingNotice
        variant="covered"
        workspaceName="Paróquia Jesus Cristo"
        dioceseName="Diocese de Teste"
        roleLabel="Coordenador"
      />,
    );

    expect(screen.getByTestId("managed-billing-notice")).toHaveAttribute(
      "data-variant",
      "covered",
    );
    expect(screen.getByTestId("managed-billing-hero")).toHaveTextContent(
      "name=Diocese de Teste",
    );
    expect(screen.getByTestId("managed-billing-who")).toHaveTextContent(
      "managed_notice.manager_diocese|name=Diocese de Teste",
    );
    expect(screen.queryByText("Coordenador")).not.toBeInTheDocument();
  });

  it("shows a pastoral paused notice without sales checkout", () => {
    render(
      <ManagedBillingNotice
        variant="paused"
        workspaceName="Paróquia Jesus Cristo"
        dioceseName="Diocese de Teste"
      />,
    );

    expect(screen.getByTestId("managed-billing-notice")).toHaveAttribute(
      "data-variant",
      "paused",
    );
    expect(screen.getByTestId("managed-billing-hero")).toHaveTextContent(
      "name=Diocese de Teste",
    );
    expect(
      screen.queryByTestId("managed-billing-diocese-sales"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });
});
