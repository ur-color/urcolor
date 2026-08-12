import { describe, expect, it } from "bun:test";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Color } from "@urcolor/core";
import { ColorSlider } from "./index";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function renderInto(node: ReactElement) {
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

/** A callback and the last value it received. */
function sink<T>() {
  const box: { value?: T } = {};
  return {
    box,
    set: (value: T) => {
      box.value = value;
    },
  };
}

function hueSlider(onValueChange?: (c: Color) => void, extra: Record<string, unknown> = {}) {
  return (
    <ColorSlider.Root value="hsl(210, 80%, 50%)" channel="h" onValueChange={onValueChange} {...extra}>
      <ColorSlider.Control>
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}

function fireArrowRight(el: Element) {
  act(() => {
    el.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
  });
}

function hueAfterArrowRight(extra: Record<string, unknown> = {}): number {
  const seen = sink<Color>();
  const { container, cleanup } = renderInto(hueSlider(seen.set, extra));
  fireArrowRight(container.querySelector("[role='slider']")!);
  cleanup();
  expect(seen.box.value).toBeDefined();
  return Math.round(seen.box.value!.to("hsl").get("h"));
}

describe("ColorSlider behaviour", () => {
  it("exposes the channel value through slider aria", () => {
    const { container, cleanup } = renderInto(hueSlider());
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    expect(thumb.getAttribute("aria-valuenow")).toBe("210");
    expect(thumb.getAttribute("aria-valuemax")).toBe("360");
    cleanup();
  });

  it("advances the hue on ArrowRight", () => {
    expect(hueAfterArrowRight()).toBe(211);
  });

  it("reverses arrow direction when inverted", () => {
    expect(hueAfterArrowRight({ inverted: true })).toBe(209);
  });

  it("mirrors arrow direction in rtl", () => {
    expect(hueAfterArrowRight({ dir: "rtl" })).toBe(209);
  });

  it("marks orientation and disabled on the root", () => {
    const { container, cleanup } = renderInto(
      hueSlider(undefined, { orientation: "vertical", disabled: true }),
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-orientation")).toBe("vertical");
    expect(root.getAttribute("data-disabled")).toBe("");
    cleanup();
  });
});
