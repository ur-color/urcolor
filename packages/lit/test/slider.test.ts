import { describe, expect, it } from "bun:test";
import type { Color } from "@urcolor/core";
import "../src/components/slider/index";
import type { UrcolorSliderRoot } from "../src/components/slider/UrcolorSliderRoot";

function mount(markup: string) {
  const host = document.createElement("div");
  host.innerHTML = markup;
  document.body.appendChild(host);
  return { host, cleanup: () => host.remove() };
}

/**
 * Waits for every element in the tree to finish updating. A root's own first
 * update ends in `notify()`, which schedules one more update on each part, so
 * awaiting a single element is not enough to reach a quiet tree.
 */
async function settle(host: HTMLElement): Promise<void> {
  for (let i = 0; i < 3; i++) {
    const pending = Array.from(host.querySelectorAll("*"))
      .map(el => (el as Partial<{ updateComplete: Promise<unknown> }>).updateComplete)
      .filter((entry): entry is Promise<unknown> => Boolean(entry));
    await Promise.all(pending);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}

const TREE = `
  <urcolor-slider-root channel="h">
    <urcolor-slider-control>
      <urcolor-slider-track>
        <urcolor-slider-range></urcolor-slider-range>
        <urcolor-slider-thumb></urcolor-slider-thumb>
      </urcolor-slider-track>
    </urcolor-slider-control>
  </urcolor-slider-root>`;

function arrowRight(el: Element): void {
  el.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
}

describe("urcolor-slider", () => {
  it("keeps the author's element tree intact", async () => {
    const { host, cleanup } = mount(TREE);
    await settle(host);
    expect(host.querySelector("urcolor-slider-control")).not.toBeNull();
    expect(host.querySelector("urcolor-slider-track")).not.toBeNull();
    expect(host.querySelector("urcolor-slider-range")).not.toBeNull();
    expect(host.querySelector("urcolor-slider-thumb")).not.toBeNull();
    cleanup();
  });

  it("gives the thumb slider semantics from the color", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
    root.value = "hsl(210, 80%, 50%)";
    await settle(host);
    const thumb = host.querySelector("urcolor-slider-thumb")!;
    expect(thumb.getAttribute("role")).toBe("slider");
    expect(thumb.getAttribute("aria-valuenow")).toBe("210");
    expect(thumb.getAttribute("aria-valuemax")).toBe("360");
    expect(thumb.getAttribute("tabindex")).toBe("0");
    cleanup();
  });

  it("marks orientation and disabled on the root", async () => {
    const { host, cleanup } = mount(
      "<urcolor-slider-root channel=\"h\" orientation=\"vertical\" disabled></urcolor-slider-root>",
    );
    await settle(host);
    const root = host.querySelector("urcolor-slider-root")!;
    expect(root.getAttribute("data-orientation")).toBe("vertical");
    expect(root.getAttribute("data-disabled")).toBe("");
    cleanup();
  });

  it("steps the channel on ArrowRight and emits colorchange", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
    root.value = "hsl(210, 80%, 50%)";
    await settle(host);

    let emitted: number | undefined;
    root.addEventListener("colorchange", (event) => {
      emitted = Math.round((event as CustomEvent<{ color: Color }>).detail.color.to("hsl").get("h"));
    });

    arrowRight(host.querySelector("urcolor-slider-thumb")!);
    await settle(host);

    expect(emitted).toBe(211);
    expect(host.querySelector("urcolor-slider-thumb")!.getAttribute("aria-valuenow")).toBe("211");
    cleanup();
  });

  it("positions the thumb from the value", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
    root.value = "hsl(90, 80%, 50%)";
    await settle(host);
    const thumb = host.querySelector("urcolor-slider-thumb") as HTMLElement;
    expect(thumb.style.left).toBe("25%");
    cleanup();
  });

  it("sizes the range from the value", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
    root.value = "hsl(90, 80%, 50%)";
    await settle(host);
    const range = host.querySelector("urcolor-slider-range") as HTMLElement;
    expect(range.style.width).toBe("25%");
    cleanup();
  });

  it("ignores keys when disabled", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
    root.value = "hsl(210, 80%, 50%)";
    root.disabled = true;
    await settle(host);

    let fired = false;
    root.addEventListener("colorchange", () => {
      fired = true;
    });
    arrowRight(host.querySelector("urcolor-slider-thumb")!);
    await settle(host);
    expect(fired).toBe(false);
    cleanup();
  });

  it("reverses arrow direction when inverted", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
    root.value = "hsl(210, 80%, 50%)";
    root.inverted = true;
    await settle(host);

    let emitted: number | undefined;
    root.addEventListener("colorchange", (event) => {
      emitted = Math.round((event as CustomEvent<{ color: Color }>).detail.color.to("hsl").get("h"));
    });
    arrowRight(host.querySelector("urcolor-slider-thumb")!);
    await settle(host);
    expect(emitted).toBe(209);
    cleanup();
  });
});
