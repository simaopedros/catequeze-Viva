import React from "react";
import userEvent from "@testing-library/user-event";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthFeaturePanel from "../auth/AuthFeaturePanel";
import { AUTH_SCENES, SCENE_DURATION } from "../auth/useAuthSceneCycle";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, args?: { scene?: string }) =>
      args?.scene ? `Show ${args.scene}` : key,
  }),
}));
let reduced = false;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("reduce") && reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function current() {
  return screen.getByRole("region").getAttribute("data-scene");
}
function tick() {
  act(() => {
    vi.advanceTimersByTime(SCENE_DURATION);
  });
}

describe("auth feature panel", () => {
  it("renders every scene in sequence and wraps to the dashboard", () => {
    render(<AuthFeaturePanel />);
    for (const scene of AUTH_SCENES) {
      expect(current()).toBe(scene);
      expect(
        screen.getByRole("heading", { name: `feature_panel.${scene}.title` }),
      ).toBeInTheDocument();
      tick();
    }
    expect(current()).toBe("dashboard");
  });
  it("pauses on hover and focus, and resumes only after both leave", () => {
    render(<AuthFeaturePanel />);
    const region = screen.getByRole("region");
    const button = screen.getAllByRole("button")[0];
    fireEvent.mouseEnter(region);
    tick();
    expect(current()).toBe("dashboard");
    fireEvent.focus(button);
    fireEvent.mouseLeave(region);
    tick();
    expect(current()).toBe("dashboard");
    fireEvent.blur(button, { relatedTarget: document.body });
    tick();
    expect(current()).toBe("classes");
  });
  it("allows manual dot navigation with reduced motion and no automatic cycle", () => {
    reduced = true;
    render(<AuthFeaturePanel />);
    tick();
    expect(current()).toBe("dashboard");
    for (const [index, scene] of AUTH_SCENES.entries()) {
      const button = screen.getAllByRole("button")[index];
      act(() => button.focus());
      fireEvent.click(button); // Native button activation also handles Enter and Space.
      expect(current()).toBe(scene);
      expect(button).toHaveAttribute("aria-pressed", "true");
      tick();
      expect(current()).toBe(scene);
    }
  });
  it("activates navigation with Enter and Space", async () => {
    vi.useRealTimers();
    reduced = true;
    const user = userEvent.setup();
    render(<AuthFeaturePanel />);
    const buttons = screen.getAllByRole("button");
    act(() => buttons[1].focus());
    await user.keyboard("{Enter}");
    expect(current()).toBe("classes");
    await user.tab();
    await user.keyboard(" ");
    expect(current()).toBe("attendance");
  });
  it("pauses explicitly and while the tab is hidden", () => {
    render(<AuthFeaturePanel />);
    fireEvent.click(
      screen.getByRole("button", { name: "feature_panel.pause" }),
    );
    tick();
    expect(current()).toBe("dashboard");
    fireEvent.click(
      screen.getByRole("button", { name: "feature_panel.resume" }),
    );
    tick();
    expect(current()).toBe("classes");
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    tick();
    expect(current()).toBe("classes");
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    tick();
    expect(current()).toBe("attendance");
    hidden.mockRestore();
  });
});
