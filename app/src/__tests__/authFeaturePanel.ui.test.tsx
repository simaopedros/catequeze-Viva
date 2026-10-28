import React from "react";
import { readFileSync } from "node:fs";
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

describe.each([false, true])("auth feature panel (compact: %s)", (compact) => {
  it("keeps decorative content hidden and renders the correct variant", () => {
    const { container } = render(<AuthFeaturePanel compact={compact} />);
    expect(screen.getByRole("region")).toHaveAttribute(
      "data-mode",
      compact ? "compact" : "full",
    );
    expect(container.querySelector(".auth-mini")).toEqual(
      compact ? expect.any(HTMLElement) : null,
    );
    expect(
      container.querySelector(".auth-mini, .auth-mock-wrap"),
    ).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[aria-live]")).toBeNull();
  });
  it("cleans up timers when unmounted", () => {
    const { unmount } = render(<AuthFeaturePanel compact={compact} />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("renders every scene in sequence and wraps to the dashboard", () => {
    render(<AuthFeaturePanel compact={compact} />);
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
    render(<AuthFeaturePanel compact={compact} />);
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
    render(<AuthFeaturePanel compact={compact} />);
    expect(screen.getByRole("region")).toHaveAttribute("data-reduced", "true");
    expect(
      screen.queryByRole("button", { name: "feature_panel.pause" }),
    ).toBeNull();
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
    render(<AuthFeaturePanel compact={compact} />);
    const buttons = screen.getAllByRole("button");
    act(() => buttons[1].focus());
    await user.keyboard("{Enter}");
    expect(current()).toBe("classes");
    await user.tab();
    await user.keyboard(" ");
    expect(current()).toBe("attendance");
  });
  it("pauses explicitly and while the tab is hidden", () => {
    render(<AuthFeaturePanel compact={compact} />);
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

it("keeps the desktop panel viewport fixed and reserves navigation outside the stage", () => {
  const layout = readFileSync("src/auth/AuthPageLayout.tsx", "utf8");
  expect(layout).toContain("data-viewport-fixed={animatedPanel || undefined}");
  expect(layout).toContain(
    "lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-hidden",
  );
  const { container } = render(<AuthFeaturePanel />);
  expect(container.querySelector(".auth-feature-stage")).toBeInTheDocument();
  expect(container.querySelector(".auth-feature-controls")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button")[5]);
  expect(container.querySelectorAll(".auth-calendar > span")).toHaveLength(42);
  expect(container.querySelectorAll(".auth-day-meeting")).toHaveLength(3);
});
