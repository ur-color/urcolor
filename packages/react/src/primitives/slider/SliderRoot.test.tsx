import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SliderRoot } from "./SliderRoot";

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

describe("SliderRoot", () => {
  it("reflects orientation and disabled as data attributes", () => {
    const { container, cleanup } = renderInto(
      <SliderRoot value={50} orientation="vertical" disabled />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("data-orientation")).toBe("vertical");
    expect(el.getAttribute("data-disabled")).toBe("");
    cleanup();
  });

  it("omits data-disabled when enabled", () => {
    const { container, cleanup } = renderInto(<SliderRoot value={50} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.hasAttribute("data-disabled")).toBe(false);
    expect(el.getAttribute("data-orientation")).toBe("horizontal");
    cleanup();
  });
});
