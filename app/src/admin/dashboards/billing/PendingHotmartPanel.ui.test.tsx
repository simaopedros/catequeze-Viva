// @ts-nocheck — Wasp SDK tsc includes *.ui.test.tsx; this file is Vitest-only.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PendingHotmartPanel } from "./PendingHotmartPanel";
import {
  linkPendingHotmartEntitlement,
  listPendingHotmartEntitlements,
  useQuery,
} from "wasp/client/operations";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../i18n/useLocale", () => ({
  useLocale: () => ({ currentLocale: "pt-BR" }),
}));

const row = {
  id: "pend-1",
  email: "comprador@example.com",
  planSlug: "single",
  interval: "monthly",
  transaction: "HP-47",
  accessEndsAt: "2026-12-07T15:00:00.000Z",
};

describe("PendingHotmartPanel", () => {
  const refetch = vi.fn();

  beforeEach(() => {
    refetch.mockReset();
    (linkPendingHotmartEntitlement as any).mockReset();
    (useQuery as any).mockImplementation((query: unknown) => {
      if (query === listPendingHotmartEntitlements) {
        return { data: [row], isLoading: false, error: null, refetch };
      }
      return { data: undefined, isLoading: false, error: null, refetch };
    });
  });

  it("lists an open purchase and links it to the typed user", async () => {
    const user = userEvent.setup();
    (linkPendingHotmartEntitlement as any).mockResolvedValue({ ok: true });
    render(<PendingHotmartPanel />);

    expect(screen.getByText("comprador@example.com")).toBeInTheDocument();
    expect(screen.getByText("HP-47")).toBeInTheDocument();
    await user.type(screen.getByLabelText("pages.hotmart_pending.col_user"), "user-9");
    await user.click(screen.getByRole("button", { name: "pages.hotmart_pending.link" }));

    expect(linkPendingHotmartEntitlement).toHaveBeenCalledWith({
      pendingId: "pend-1",
      userId: "user-9",
    });
    expect(refetch).toHaveBeenCalled();
  });
});
