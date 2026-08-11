import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Toggle } from "./Toggle";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function renderInto(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}

describe("Toggle", () => {
  it("reports its pressed state through aria and data attributes", () => {
    const { container, cleanup } = renderInto(<Toggle pressed />);
    const button = container.querySelector("button") as HTMLElement;
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("data-pressed")).toBe("");
    cleanup();
  });

  it("flips on click when uncontrolled", () => {
    let seen: boolean | undefined;
    const { container, cleanup } = renderInto(
      <Toggle defaultPressed={false} onPressedChange={(p) => { seen = p; }} />,
    );
    const button = container.querySelector("button") as HTMLElement;
    click(button);
    expect(seen).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    cleanup();
  });

  it("does not flip when disabled", () => {
    let seen: boolean | undefined;
    const { container, cleanup } = renderInto(
      <Toggle disabled onPressedChange={(p) => { seen = p; }} />,
    );
    const button = container.querySelector("button") as HTMLElement;
    click(button);
    expect(seen).toBeUndefined();
    expect(button.getAttribute("data-disabled")).toBe("");
    cleanup();
  });

  it("stays where a controlled pressed prop puts it", () => {
    let seen: boolean | undefined;
    const { container, cleanup } = renderInto(
      <Toggle pressed={false} onPressedChange={(p) => { seen = p; }} />,
    );
    const button = container.querySelector("button") as HTMLElement;
    click(button);
    expect(seen).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    cleanup();
  });
});
