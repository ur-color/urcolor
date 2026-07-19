import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ColorAreaRoot } from "../root/ColorAreaRoot";
import { ColorAreaGradient } from "./ColorAreaGradient";

// React 19 requires this flag to acknowledge the test environment supports `act()`.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// Regression test for C2: unvalidated `channelOverrides` keys used to be funneled straight
// into `Color#with()`, which throws a RangeError for a channel unknown to the target space
// (the old `.set()` silently no-op'd on strays). This is reachable from the docs' own example
// override `{ s: 1, v: 1, alpha: 1 }` (HSV-only) paired with any non-HSV `colorSpace`.
describe("ColorAreaGradient channelOverrides", () => {
  it("should not throw when an override key is not a channel of the color space", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    expect(() => {
      act(() => {
        root.render(
          <ColorAreaRoot defaultValue="hsl(210, 80%, 50%)" colorSpace="hsl">
            <ColorAreaGradient channelOverrides={{ s: 1, v: 1, alpha: 1 }} />
          </ColorAreaRoot>,
        );
      });
    }).not.toThrow();

    act(() => root.unmount());
    container.remove();
  });

  it("should still apply a valid override for the color space", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    expect(() => {
      act(() => {
        root.render(
          <ColorAreaRoot defaultValue="hsv(210, 80%, 50%)" colorSpace="hsv">
            <ColorAreaGradient channelOverrides={{ s: 1, v: 1, alpha: 1 }} />
          </ColorAreaRoot>,
        );
      });
    }).not.toThrow();

    act(() => root.unmount());
    container.remove();
  });
});
