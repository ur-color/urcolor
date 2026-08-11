import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Slider } from "./index";

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

function tree(
  value: number,
  onValueChange?: (v: number) => void,
  onCommit?: (v: number) => void,
  rootProps: Record<string, unknown> = {},
) {
  return (
    <Slider.Root
      value={value}
      min={0}
      max={100}
      step={1}
      onValueChange={onValueChange}
      onValueCommitted={onCommit}
      {...rootProps}
    >
      <Slider.Control>
        <Slider.Track>
          <Slider.Indicator data-testid="indicator" />
          <Slider.Thumb />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}

function fireKey(el: Element, key: string) {
  act(() => {
    el.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

describe("Slider parts", () => {
  it("gives the thumb slider semantics", () => {
    const { container, cleanup } = renderInto(tree(30));
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    expect(thumb).not.toBeNull();
    expect(thumb.getAttribute("aria-valuenow")).toBe("30");
    expect(thumb.getAttribute("aria-valuemin")).toBe("0");
    expect(thumb.getAttribute("aria-valuemax")).toBe("100");
    expect(thumb.getAttribute("tabindex")).toBe("0");
    cleanup();
  });

  it("positions the thumb from the value", () => {
    const { container, cleanup } = renderInto(tree(25));
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    expect(thumb.style.left).toBe("25%");
    cleanup();
  });

  it("sizes the indicator from the value", () => {
    const { container, cleanup } = renderInto(tree(40));
    const indicator = container.querySelector("[data-testid='indicator']") as HTMLElement;
    expect(indicator.style.width).toBe("40%");
    expect(indicator.style.left).toBe("0px");
    cleanup();
  });

  it("steps the value on ArrowRight", () => {
    let seen: number | undefined;
    const { container, cleanup } = renderInto(tree(30, (v) => { seen = v; }));
    fireKey(container.querySelector("[role='slider']")!, "ArrowRight");
    expect(seen).toBe(31);
    cleanup();
  });

  it("commits once on keyup after a keyboard change", () => {
    let commits = 0;
    const { container, cleanup } = renderInto(tree(30, () => {}, () => { commits += 1; }));
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    fireKey(thumb, "ArrowRight");
    act(() => {
      thumb.dispatchEvent(new window.KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }));
    });
    expect(commits).toBe(1);
    cleanup();
  });

  it("ignores keys on a disabled slider", () => {
    let seen: number | undefined;
    const { container, cleanup } = renderInto(
      tree(30, (v) => { seen = v; }, undefined, { disabled: true }),
    );
    fireKey(container.querySelector("[role='slider']")!, "ArrowRight");
    expect(seen).toBeUndefined();
    cleanup();
  });

  it("mirrors arrow direction when inverted", () => {
    let seen: number | undefined;
    const { container, cleanup } = renderInto(
      tree(30, (v) => { seen = v; }, undefined, { inverted: true }),
    );
    fireKey(container.querySelector("[role='slider']")!, "ArrowRight");
    expect(seen).toBe(29);
    cleanup();
  });

  it("fills a vertical track from the bottom", () => {
    const { container, cleanup } = renderInto(
      tree(40, undefined, undefined, { orientation: "vertical" }),
    );
    const indicator = container.querySelector("[data-testid='indicator']") as HTMLElement;
    expect(indicator.style.height).toBe("40%");
    expect(indicator.style.bottom).toBe("0px");
    cleanup();
  });
});
