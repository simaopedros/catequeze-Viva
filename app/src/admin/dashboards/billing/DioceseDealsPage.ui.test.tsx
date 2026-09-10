// @ts-nocheck — Wasp SDK tsc includes *.ui.test.tsx; this file is Vitest-only.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import DioceseDealsPage from "./DioceseDealsPage";
import {
  listDioceseDeals,
  listDioceses,
  useQuery,
} from "wasp/client/operations";

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

vi.mock("../../layout/DefaultLayout", () => ({
  default: ({ children }: { children: any }) => <div>{children}</div>,
}));

const deals = [
  {
    id: "bill-1",
    dioceseId: "d1",
    dioceseName: "Diocese de Teste",
    status: "ACTIVE",
    covering: true,
    parishesUsed: 4,
    maxParishes: 12,
    maxClasses: null,
    maxCatechists: null,
    maxCatechumens: null,
    internalNotes: "PIX combinado",
    externalReference: "CTR-1",
    agreedPriceCents: 150000,
    startsAt: null,
    endsAt: null,
  },
  {
    id: "bill-2",
    dioceseId: "d2",
    dioceseName: "Arquidiocese de BH",
    status: "SUSPENDED",
    covering: false,
    parishesUsed: 8,
    maxParishes: 10,
    maxClasses: null,
    maxCatechists: null,
    maxCatechumens: null,
    internalNotes: null,
    externalReference: null,
    agreedPriceCents: null,
    startsAt: null,
    endsAt: null,
  },
];

describe("Admin DioceseDealsPage", () => {
  beforeEach(() => {
    (useQuery as any).mockImplementation((query: unknown) => {
      if (query === listDioceseDeals) {
        return {
          data: deals,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      }
      if (query === listDioceses) {
        return {
          data: [
            { id: "d1", name: "Diocese de Teste" },
            { id: "d3", name: "Diocese Nova" },
          ],
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
    });
  });

  it("lists negotiated deals with parish quota and no Stripe checkout copy", () => {
    render(
      <MemoryRouter>
        <DioceseDealsPage user={{ id: "admin", isAdmin: true } as any} />
      </MemoryRouter>,
    );

    expect(screen.getByText("pages.deals.title")).toBeInTheDocument();
    expect(screen.getByText("Diocese de Teste")).toBeInTheDocument();
    expect(screen.getByText("Arquidiocese de BH")).toBeInTheDocument();
    expect(screen.getByText("4/12")).toBeInTheDocument();
    expect(screen.queryByText(/stripe/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/checkout/i)).not.toBeInTheDocument();
  });

  it("filters by diocese name and opens the create form", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DioceseDealsPage user={{ id: "admin", isAdmin: true } as any} />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByPlaceholderText("pages.deals.search_placeholder"),
      "Arquidiocese",
    );
    expect(screen.getByText("Arquidiocese de BH")).toBeInTheDocument();
    expect(screen.queryByText("Diocese de Teste")).not.toBeInTheDocument();

    await user.clear(
      screen.getByPlaceholderText("pages.deals.search_placeholder"),
    );
    await user.click(screen.getByRole("button", { name: /pages.deals.new$/ }));
    expect(screen.getByText("pages.deals.new_title")).toBeInTheDocument();
    expect(screen.getByText("pages.deals.max_parishes")).toBeInTheDocument();
    expect(screen.getByText("pages.deals.agreed_price")).toBeInTheDocument();
  });
});
