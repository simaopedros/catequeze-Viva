import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarPage from "./CalendarPage";
import {
  listLiturgicalEvents,
  listClasses,
  listMeetingsForClasses,
} from "wasp/client/operations";
import { todayKey } from "../../__tests__/ui/hierarchyFixtures";
import {
  parishCoordinator,
  renderPage,
  stubUseQuery,
} from "../../__tests__/ui/hierarchyTestUtils";

const userCtx = vi.hoisted(() => ({
  current: { userRole: "PARISH_COORDINATOR", userId: "user-coord" },
}));

vi.mock("react-i18next", async () => {
  const { mockUseTranslation } = await import(
    "../../__tests__/ui/hierarchyFixtures"
  );
  return {
    useTranslation: (ns?: string) => mockUseTranslation(ns),
  };
});

vi.mock("../../client/hooks/useActiveParish", () => ({
  useActiveParish: () => ({ activeParishId: "parish-1" }),
}));

vi.mock("../../client/hooks/useUserContext", () => ({
  useUserContext: () => userCtx.current,
}));

vi.mock("../../client/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("../../client/hooks/useConfirm", () => ({
  useConfirm: () => ({ confirm: vi.fn(), confirmDialog: null }),
}));

describe("CalendarPage — origem e conflitos", () => {
  const day = todayKey();

  beforeEach(() => {
    userCtx.current = parishCoordinator();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });
    stubUseQuery([
      [
        listLiturgicalEvents,
        [
          {
            id: "evt-dio-1",
            name: "Abertura diocesana",
            date: day,
            type: "diocese",
            parishId: null,
            ownerType: "DIOCESE",
            inheritancePolicy: "LOCKED",
            inherited: true,
            origin: { ownerType: "DIOCESE", inherited: true, policy: "LOCKED" },
          },
          {
            id: "evt-parish-1",
            name: "Festa da padroeira",
            date: day,
            type: "parish",
            parishId: "parish-1",
            ownerType: "PARISH",
            inheritancePolicy: "LOCAL",
            inherited: false,
            origin: { ownerType: "PARISH", inherited: false, policy: "LOCAL" },
          },
        ],
      ],
      [
        listClasses,
        [{ id: "class-1", name: "Crisma 2026", parishId: "parish-1" }],
      ],
    ]);
    vi.mocked(listMeetingsForClasses).mockResolvedValue([
      {
        id: "mtg-1",
        title: "Encontro Crisma",
        date: day,
        classId: "class-1",
      },
    ] as never);
  });

  it("alerta encontro no mesmo dia de um evento obrigatório da diocese", async () => {
    renderPage(<CalendarPage />);
    const alert = await screen.findByTestId("calendar-conflicts");
    expect(alert).toHaveTextContent("Possível conflito no calendário");
    expect(alert).toHaveTextContent("Abertura diocesana");
    expect(alert).toHaveTextContent("Encontro Crisma");
  });

  it("filtra a vista para só eventos da diocese", async () => {
    const user = userEvent.setup();
    renderPage(<CalendarPage />);
    await screen.findByTestId("calendar-conflicts");

    await user.click(screen.getByRole("button", { name: "Diocese" }));
    await waitFor(() => {
      expect(screen.getAllByText("Abertura diocesana").length).toBeGreaterThan(
        0,
      );
      expect(screen.queryByText("Festa da padroeira")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("calendar-conflicts")).toBeInTheDocument();
  });
});
