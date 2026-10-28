/** @vitest-environment jsdom */
import React, { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DetailTabs } from "../client/components/DetailTabs";

afterEach(cleanup);
describe("detail tabs keyboard", () => {
  it("moves selection and focus with arrows, Home and End", () => {
    function Example() {
      const [value, setValue] = useState("one");
      return <><DetailTabs id="example" tabs={[{ id: "one", label: "One" }, { id: "two", label: "Two" }, { id: "three", label: "Three" }]} value={value} onChange={setValue} /><div role="tabpanel" id={`example-panel-${value}`} aria-labelledby={`example-tab-${value}`}>Conteúdo</div></>;
    }
    render(React.createElement(Example));
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tabs[2]);
    expect(tabs[2].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].tabIndex).toBe(-1);
    fireEvent.keyDown(tabs[2], { key: "Home" });
    expect(document.activeElement).toBe(tabs[0]);
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[1]);
    fireEvent.keyDown(tabs[1], { key: "End" });
    expect(document.activeElement).toBe(tabs[2]);
    const panel = screen.getByRole("tabpanel", { name: "Three" });
    expect(tabs[2].getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[2].id);
  });
});
