/** @jsxImportSource preact */
import { existsSync } from "node:fs";
import { describe, expect, it } from "bun:test";
import { render, type ComponentChild } from "preact";
import { Color } from "@urcolor/core";

/**
 * These run against the built bundle rather than the source.
 *
 * The point of this package is that the React source works once `react` is
 * aliased to `preact/compat`, and that alias lives in `vite.config.ts`. Bun's
 * test runner has no equivalent, so importing the source here would pull in
 * real React and prove nothing. `dist/index.js` is the artifact that ships,
 * and it already has Preact baked in.
 */
const DIST = new URL("../dist/index.js", import.meta.url).pathname;
const built = existsSync(DIST);

const COLOR = Color.parse("hsl(210, 80%, 50%)")!;

/**
 * Preact defers effects past the render, and the slider attaches its pointer
 * and keyboard listeners in one. React's `act()` flushed those synchronously.
 *
 * Preact schedules them on `requestAnimationFrame`, so a bare `setTimeout(0)`
 * can run first and see no listeners; waiting for the frame and then a task is
 * what reliably lands after them.
 */
function flushEffects(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => setTimeout(resolve, 0));
      return;
    }
    setTimeout(resolve, 0);
  });
}

function mount(node: ComponentChild) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  render(node, container);
  return {
    container,
    cleanup: () => {
      render(null, container);
      container.remove();
    },
  };
}

if (!built) {
  console.warn(
    "[@urcolor/preact] dist/index.js is missing, so the smoke tests did not run. "
    + "Build it first: bun run --cwd packages/preact build",
  );
}

describe.skipIf(!built)("@urcolor/preact smoke", () => {
  // The bundle is loaded at runtime from a path, so it has no static type.
  let m: Record<string, any>;

  it("loads the bundle", async () => {
    m = await import(DIST);
    expect(m.ColorSlider).toBeDefined();
    expect(m.useColor).toBeDefined();
  });

  it("mounts ColorSlider with slider semantics", () => {
    const { container, cleanup } = mount(
      <m.ColorSlider.Root value={COLOR} channel="h">
        <m.ColorSlider.Control>
          <m.ColorSlider.Track><m.ColorSlider.Thumb /></m.ColorSlider.Track>
        </m.ColorSlider.Control>
      </m.ColorSlider.Root>,
    );
    const thumb = container.querySelector("[role='slider']")!;
    expect(thumb.getAttribute("aria-valuenow")).toBe("210");
    expect(thumb.getAttribute("aria-valuemax")).toBe("360");
    cleanup();
  });

  it("steps the slider value on ArrowRight", async () => {
    let next: Color | undefined;
    const onChange = (c: Color) => {
      next = c;
    };
    const { container, cleanup } = mount(
      <m.ColorSlider.Root value={COLOR} channel="h" onValueChange={onChange}>
        <m.ColorSlider.Control>
          <m.ColorSlider.Track><m.ColorSlider.Thumb /></m.ColorSlider.Track>
        </m.ColorSlider.Control>
      </m.ColorSlider.Root>,
    );
    await flushEffects();
    container.querySelector("[role='slider']")!
      .dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(next).toBeDefined();
    expect(Math.round(next!.to("hsl").get("h"))).toBe(211);
    cleanup();
  });

  it("mounts ColorArea", () => {
    const { container, cleanup } = mount(
      <m.ColorArea.Root value={COLOR}><m.ColorArea.Thumb /></m.ColorArea.Root>,
    );
    expect(container.firstElementChild).not.toBeNull();
    cleanup();
  });

  it("mounts ColorWheel", () => {
    const { container, cleanup } = mount(
      <m.ColorWheel.Root value={COLOR}><m.ColorWheel.Thumb /></m.ColorWheel.Root>,
    );
    expect(container.firstElementChild).not.toBeNull();
    cleanup();
  });

  it("mounts ColorRing", () => {
    const { container, cleanup } = mount(
      <m.ColorRing.Root value={COLOR}>
        <m.ColorRing.Track><m.ColorRing.Thumb /></m.ColorRing.Track>
      </m.ColorRing.Root>,
    );
    expect(container.firstElementChild).not.toBeNull();
    cleanup();
  });

  it("mounts ColorTriangle", () => {
    const { container, cleanup } = mount(
      <m.ColorTriangle.Root value={COLOR}><m.ColorTriangle.Thumb /></m.ColorTriangle.Root>,
    );
    expect(container.firstElementChild).not.toBeNull();
    cleanup();
  });

  it("mounts ColorField with an input", () => {
    const { container, cleanup } = mount(
      <m.ColorField.Root value={COLOR} channel="h"><m.ColorField.Input /></m.ColorField.Root>,
    );
    expect(container.querySelector("input")).not.toBeNull();
    cleanup();
  });

  it("mounts ColorSwatch standalone and inside a group", () => {
    const solo = mount(<m.ColorSwatch value="#ff0000" />);
    expect(solo.container.querySelector("[role='img']")).not.toBeNull();
    solo.cleanup();

    const grouped = mount(
      <m.ColorSwatchGroup.Root defaultValue={["#ff0000"]}>
        <m.ColorSwatch value="#ff0000" />
        <m.ColorSwatch value="#00ff00" />
      </m.ColorSwatchGroup.Root>,
    );
    const buttons = grouped.container.querySelectorAll("button");
    expect(buttons.length).toBe(2);
    expect(buttons[0]!.getAttribute("data-state")).toBe("on");
    grouped.cleanup();
  });
});
