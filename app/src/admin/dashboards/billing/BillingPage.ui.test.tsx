// @ts-nocheck — Wasp SDK tsc includes *.ui.test.tsx; this file is Vitest-only.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import BillingPage from "./BillingPage";
import {
  listAdminLicenses,
  listPricingPlansAdmin,
  useQuery,
} from "wasp/client/operations";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { email?: string }) => {
      if (key === "pages.licenses.open_owner") {
        return `open ${opts?.email ?? ""}`;
      }
      return key;
    },
  }),
}));

vi.mock("../../layout/DefaultLayout", () => ({
  default: ({ children }: { children: any }) => <div>{children}</div>,
}));

vi.mock("../../../i18n/useLocale", () => ({
  useLocale: () => ({ currentLocale: "pt-BR" }),
}));

const licenses = [
  {
    id: "bill-1",
    billingId: "bill-1",
    kind: "parish" as const,
    entityId: "parish-1",
    name: "Paróquia São José",
    type: "PARISH",
    plan: "single",
    status: "ACTIVE",
    trialEndsAt: null,
    ownerEmail: "coord@paroquia.com",
    ownerName: "Ana Silva",
    ownerId: "user-1",
    hasStripe: true,
    active: true,
  },
  {
    id: "bill-2",
    billingId: "bill-2",
    kind: "diocese" as const,
    entityId: "diocese-1",
    name: "Arquidiocese de BH",
    type: "DIOCESE",
    plan: "diocese",
    status: "ACTIVE",
    trialEndsAt: null,
    ownerEmail: "admin@diocese.com",
    ownerName: "Pedro Santos",
    ownerId: "user-2",
    hasStripe: false,
    active: true,
  },
];

describe("Admin BillingPage — responsável da licença", () => {
  beforeEach(() => {
    (useQuery as any).mockImplementation((query: unknown) => {
      if (query === listAdminLicenses) {
        return {
          data: licenses,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (query === listPricingPlansAdmin) {
        return { data: [], isLoading: false, error: null, refetch: vi.fn() };
      }
      return {
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
  });

  it("mostra o e-mail da pessoa responsável pelo plano", () => {
    render(
      <MemoryRouter>
        <BillingPage user={{ id: "admin", isAdmin: true } as any} />
      </MemoryRouter>,
    );

    expect(screen.getByText("pages.licenses.col_owner")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "open coord@paroquia.com" }),
    ).toHaveAttribute("href", "/admin/users/user-1");
    expect(
      screen.getByRole("link", { name: "open admin@diocese.com" }),
    ).toHaveAttribute("href", "/admin/users/user-2");
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("Pedro Santos")).toBeInTheDocument();
  });

  it("filtra a lista pelo e-mail do responsável", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BillingPage user={{ id: "admin", isAdmin: true } as any} />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByPlaceholderText("pages.licenses.search_placeholder"),
      "admin@diocese.com",
    );

    expect(screen.getByText("Arquidiocese de BH")).toBeInTheDocument();
    expect(screen.queryByText("Paróquia São José")).not.toBeInTheDocument();
  });
});
