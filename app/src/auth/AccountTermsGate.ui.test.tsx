import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
const state = vi.hoisted(() => ({
  user: { termsAcceptanceRequired: true, isAdmin: false } as any,
  pathname: "/app/classes",
  accept: vi.fn(),
}));
vi.mock("wasp/client/auth", () => ({ useAuth: () => ({ data: state.user }) }));
vi.mock("wasp/client/operations", () => ({ acceptAccountTerms: state.accept }));
vi.mock("react-router", () => ({
  useLocation: () => ({ pathname: state.pathname }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../client/components/ui/checkbox", () => ({
  Checkbox: (props: any) =>
    React.createElement("input", {
      type: "checkbox",
      checked: props.checked,
      onChange: (e: any) => props.onCheckedChange(e.target.checked),
    }),
}));
import { AccountTermsGate } from "./AccountTermsGate";
function mount() {
  return render(
    React.createElement(AccountTermsGate, { children: "protected content" }),
  );
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  state.user = { termsAcceptanceRequired: true, isAdmin: false };
  state.pathname = "/app/classes";
});
describe("account terms recovery", () => {
  it.each([null, false, undefined])(
    "bypasses old account marker %s",
    (marker) => {
      state.user.termsAcceptanceRequired = marker;
      mount();
      expect(screen.getByText("protected content")).toBeTruthy();
      expect(state.accept).not.toHaveBeenCalled();
    },
  );
  it("bypasses admins", () => {
    state.user.isAdmin = true;
    mount();
    expect(screen.getByText("protected content")).toBeTruthy();
  });
  it.each(["/", "/terms", "/privacy", "/login", "/familia", "/blog/article"])(
    "bypasses public route %s",
    (path) => {
      state.pathname = path;
      mount();
      expect(screen.getByText("protected content")).toBeTruthy();
    },
  );
  it("shows errors and retries acceptance successfully", async () => {
    state.accept
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({});
    mount();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("terms_continue"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByText("terms_retry"));
    expect(await screen.findByText("protected content")).toBeTruthy();
    expect(state.accept).toHaveBeenCalledWith({ accepted: true });
  });
  it("releases a stalled request for retry after 15 seconds", async () => {
    vi.useFakeTimers();
    state.accept.mockImplementationOnce(() => new Promise(() => {}));
    mount();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("terms_continue"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      (screen.getByText("terms_retry").closest("button") as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});
