import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Toggle } from "./Toggle";
import { ToggleGroup } from "./ToggleGroup";

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

function click(el: Element) {
  act(() => { el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
}

function fireKey(el: Element, key: string) {
  act(() => {
    el.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

function group(props: Record<string, unknown> = {}) {
  return (
    <ToggleGroup {...props}>
      <Toggle value="red" />
      <Toggle value="green" />
      <Toggle value="blue" />
    </ToggleGroup>
  );
}

describe("ToggleGroup", () => {
  it("selects a single value by default", () => {
    let seen: string[] | undefined;
    const { container, cleanup } = renderInto(group({ onValueChange: (v: string[]) => { seen = v; } }));
    const buttons = container.querySelectorAll("button");
    click(buttons[1]!);
    expect(seen).toEqual(["green"]);
    cleanup();
  });

  it("replaces the selection in single mode", () => {
    let seen: string[] | undefined;
    const { container, cleanup } = renderInto(
      group({ defaultValue: ["red"], onValueChange: (v: string[]) => { seen = v; } }),
    );
    click(container.querySelectorAll("button")[2]!);
    expect(seen).toEqual(["blue"]);
    cleanup();
  });

  it("deselects when the selected item is clicked again", () => {
    let seen: string[] | undefined;
    const { container, cleanup } = renderInto(
      group({ defaultValue: ["red"], onValueChange: (v: string[]) => { seen = v; } }),
    );
    click(container.querySelectorAll("button")[0]!);
    expect(seen).toEqual([]);
    cleanup();
  });

  it("accumulates the selection when multiple", () => {
    let seen: string[] | undefined;
    const { container, cleanup } = renderInto(
      group({ multiple: true, defaultValue: ["red"], onValueChange: (v: string[]) => { seen = v; } }),
    );
    click(container.querySelectorAll("button")[1]!);
    expect(seen).toEqual(["red", "green"]);
    cleanup();
  });

  it("moves the tab stop with ArrowRight", () => {
    const { container, cleanup } = renderInto(group());
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons[0]!.getAttribute("tabindex")).toBe("0");
    fireKey(buttons[0]!, "ArrowRight");
    expect(buttons[1]!.getAttribute("tabindex")).toBe("0");
    expect(buttons[0]!.getAttribute("tabindex")).toBe("-1");
    cleanup();
  });

  it("wraps past the last item when looping", () => {
    const { container, cleanup } = renderInto(group());
    const buttons = Array.from(container.querySelectorAll("button"));
    fireKey(buttons[0]!, "End");
    expect(buttons[2]!.getAttribute("tabindex")).toBe("0");
    fireKey(buttons[2]!, "ArrowRight");
    expect(buttons[0]!.getAttribute("tabindex")).toBe("0");
    cleanup();
  });

  it("stops at the ends when loopFocus is off", () => {
    const { container, cleanup } = renderInto(group({ loopFocus: false }));
    const buttons = Array.from(container.querySelectorAll("button"));
    fireKey(buttons[0]!, "ArrowLeft");
    expect(buttons[0]!.getAttribute("tabindex")).toBe("0");
    cleanup();
  });

  it("ignores keys and clicks when disabled", () => {
    let seen: string[] | undefined;
    const { container, cleanup } = renderInto(
      group({ disabled: true, onValueChange: (v: string[]) => { seen = v; } }),
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    click(buttons[1]!);
    fireKey(buttons[0]!, "ArrowRight");
    expect(seen).toBeUndefined();
    cleanup();
  });
});
