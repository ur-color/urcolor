import { describe, expect, it } from "bun:test";
import type { Color } from "@urcolor/core";
import "../src/components/area/index";
import type { UrcolorAreaRoot } from "../src/components/area/UrcolorAreaRoot";

function mount(markup: string) {
  const host = document.createElement("div");
  host.innerHTML = markup;
  document.body.appendChild(host);
  return { host, cleanup: () => host.remove() };
}

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
  <urcolor-area-root color-space="hsv" x-channel="s" y-channel="v">
    <urcolor-area-thumb></urcolor-area-thumb>
  </urcolor-area-root>`;

function key(el: Element, name: string): void {
  el.dispatchEvent(new window.KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
}

describe("urcolor-area", () => {
  it("keeps the author's element tree intact", async () => {
    const { host, cleanup } = mount(TREE);
    await settle(host);
    expect(host.querySelector("urcolor-area-thumb")).not.toBeNull();
    cleanup();
  });

  it("gives the thumb 2D slider semantics", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-area-root") as UrcolorAreaRoot;
    root.value = "rgb(51, 153, 204)";
    await settle(host);
    const thumb = host.querySelector("urcolor-area-thumb")!;
    expect(thumb.getAttribute("role")).toBe("slider");
    expect(thumb.getAttribute("aria-roledescription")).toBe("2D slider");
    expect(thumb.getAttribute("aria-valuenow")).toBe("75");
    expect(thumb.getAttribute("tabindex")).toBe("0");
    cleanup();
  });

  it("positions the thumb on both axes", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-area-root") as UrcolorAreaRoot;
    root.value = "rgb(51, 153, 204)";
    await settle(host);
    const thumb = host.querySelector("urcolor-area-thumb") as HTMLElement;
    expect(thumb.style.left).toBe("75%");
    expect(thumb.style.top).toBe("80%");
    cleanup();
  });

  it("steps the x channel on ArrowRight", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-area-root") as UrcolorAreaRoot;
    root.value = "rgb(51, 153, 204)";
    await settle(host);

    let emitted: Color | undefined;
    root.addEventListener("colorchange", (event) => {
      emitted = (event as CustomEvent<{ color: Color }>).detail.color;
    });
    key(host.querySelector("urcolor-area-thumb")!, "ArrowRight");
    await settle(host);

    expect(emitted).toBeDefined();
    expect(Math.round(emitted!.to("hsv").get("s") * 100)).toBe(76);
    cleanup();
  });

  it("steps the y channel on ArrowDown", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-area-root") as UrcolorAreaRoot;
    root.value = "rgb(51, 153, 204)";
    await settle(host);

    let emitted: Color | undefined;
    root.addEventListener("colorchange", (event) => {
      emitted = (event as CustomEvent<{ color: Color }>).detail.color;
    });
    key(host.querySelector("urcolor-area-thumb")!, "ArrowDown");
    await settle(host);

    expect(Math.round(emitted!.to("hsv").get("v") * 100)).toBe(81);
    cleanup();
  });

  it("anchors from the opposite edge when an axis is inverted", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-area-root") as UrcolorAreaRoot;
    root.value = "rgb(51, 153, 204)";
    root.xInverted = true;
    await settle(host);
    const thumb = host.querySelector("urcolor-area-thumb") as HTMLElement;
    expect(thumb.style.right).toBe("75%");
    expect(thumb.style.left).toBe("");
    cleanup();
  });

  it("ignores keys when disabled", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-area-root") as UrcolorAreaRoot;
    root.value = "rgb(51, 153, 204)";
    root.disabled = true;
    await settle(host);

    let fired = false;
    root.addEventListener("colorchange", () => {
      fired = true;
    });
    key(host.querySelector("urcolor-area-thumb")!, "ArrowRight");
    await settle(host);
    expect(fired).toBe(false);
    expect(host.querySelector("urcolor-area-thumb")!.hasAttribute("tabindex")).toBe(false);
    cleanup();
  });
});
