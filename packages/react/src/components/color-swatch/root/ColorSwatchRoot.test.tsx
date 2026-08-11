import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Color } from "@urcolor/core";
import { ColorSwatchRoot } from "./ColorSwatchRoot";

// React 19 requires this flag to acknowledge the test environment supports `act()`.
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

// Regression test for C1: `@urcolor/core`'s `Color.from` throws on invalid input (unlike the
// old `internationalized-color` library, which returned null/undefined). ColorSwatchRoot must
// not throw on a bad color string — it should degrade gracefully to "transparent".
describe("ColorSwatchRoot", () => {
  it("should not throw when value is an invalid color string", () => {
    let cleanup: (() => void) | undefined;
    expect(() => {
      const result = renderInto(<ColorSwatchRoot value="not-a-color" />);
      cleanup = result.cleanup;
    }).not.toThrow();
    cleanup?.();
  });

  it("should render as transparent when value is an invalid color string", () => {
    const { container, cleanup } = renderInto(<ColorSwatchRoot value="not-a-color" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue("--urcolor-swatch-color")).toBe("transparent");
    cleanup();
  });

  it("should emit all four CSS variables even with no valid color", () => {
    const { container, cleanup } = renderInto(<ColorSwatchRoot value={null} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue("--urcolor-swatch-color")).toBe("transparent");
    expect(el.style.getPropertyValue("--urcolor-swatch-color-opaque")).toBe("transparent");
    expect(el.style.getPropertyValue("--urcolor-swatch-alpha")).toBe("1");
    expect(el.style.getPropertyValue("--urcolor-swatch-checkerboard")).not.toBe("");
    cleanup();
  });

  // The deprecated names carry the resolved value rather than a `var()` at
  // their replacement, so reading one from script still returns a colour.
  it("should keep the deprecated variable names readable", () => {
    const { container, cleanup } = renderInto(<ColorSwatchRoot value="red" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue("--swatch-color"))
      .toBe(el.style.getPropertyValue("--urcolor-swatch-color"));
    expect(el.style.getPropertyValue("--swatch-alpha")).toBe("1");
    cleanup();
  });

  it("should still render a valid color string", () => {
    const { container, cleanup } = renderInto(<ColorSwatchRoot value="red" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue("--urcolor-swatch-color")).not.toBe("transparent");
    cleanup();
  });

  it("should accept a Color instance without re-parsing", () => {
    const color = Color.parse("hsl(210, 80%, 50%)")!;
    let cleanup: (() => void) | undefined;
    expect(() => {
      const result = renderInto(<ColorSwatchRoot value={color} />);
      cleanup = result.cleanup;
    }).not.toThrow();
    cleanup?.();
  });
});
