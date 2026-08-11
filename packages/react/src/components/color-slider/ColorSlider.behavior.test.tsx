import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Color } from "@urcolor/core";
import { ColorSlider } from "./index";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function renderInto(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(node); });
  return {
    container,
    cleanup: () => { act(() => root.unmount()); container.remove(); },
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

describe("ColorSlider behaviour", () => {
  it("exposes the channel value through slider aria", () => {
    const { container, cleanup } = renderInto(hueSlider());
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    expect(thumb.getAttribute("aria-valuenow")).toBe("210");
    expect(thumb.getAttribute("aria-valuemax")).toBe("360");
    cleanup();
  });

  it("advances the hue on ArrowRight", () => {
    let next: Color | undefined;
    const { container, cleanup } = renderInto(hueSlider((c) => { next = c; }));
    fireArrowRight(container.querySelector("[role='slider']")!);
    expect(next).toBeDefined();
    expect(Math.round(next!.to("hsl").get("h"))).toBe(211);
    cleanup();
  });

  it("reverses arrow direction when inverted", () => {
    let next: Color | undefined;
    const { container, cleanup } = renderInto(hueSlider((c) => { next = c; }, { inverted: true }));
    fireArrowRight(container.querySelector("[role='slider']")!);
    expect(Math.round(next!.to("hsl").get("h"))).toBe(209);
    cleanup();
  });

  it("mirrors arrow direction in rtl", () => {
    let next: Color | undefined;
    const { container, cleanup } = renderInto(hueSlider((c) => { next = c; }, { dir: "rtl" }));
    fireArrowRight(container.querySelector("[role='slider']")!);
    expect(Math.round(next!.to("hsl").get("h"))).toBe(209);
    cleanup();
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
