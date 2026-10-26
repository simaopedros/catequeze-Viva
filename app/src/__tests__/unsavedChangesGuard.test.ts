import { describe, expect, it } from "vitest";
import {
  SKIP_UNSAVED_GUARD_STATE,
  shouldBlockNavigation,
} from "../client/hooks/useUnsavedChangesGuard";

describe("shouldBlockNavigation", () => {
  const editor = { pathname: "/app/content-library/new" };

  it("blocks leaving a dirty page for another route", () => {
    expect(shouldBlockNavigation(true, editor, { pathname: "/app" })).toBe(
      true,
    );
  });

  it("never blocks when the page is clean", () => {
    expect(shouldBlockNavigation(false, editor, { pathname: "/app" })).toBe(
      false,
    );
  });

  it("ignores search or hash changes on the same page", () => {
    expect(
      shouldBlockNavigation(true, editor, { pathname: editor.pathname }),
    ).toBe(false);
  });

  it("lets the app's own redirects through", () => {
    expect(
      shouldBlockNavigation(true, editor, {
        pathname: "/app/content-library/abc/edit",
        state: SKIP_UNSAVED_GUARD_STATE,
      }),
    ).toBe(false);
  });
});
