import type { DOMWrapper, VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { ColorTriangleRoot, ColorTriangleThumb } from "../src/components/ColorTriangle";

function makeTriangle(extra: Record<string, unknown> = {}) {
  return defineComponent({
    emits: ["update:modelValue", "update:color", "change", "changeEnd"],
    setup(_, { emit }) {
      return () =>
        h(ColorTriangleRoot, {
          "defaultValue": "rgb(64 128 128)", // exactly hsv(180, 50%, 50%)
          "colorSpace": "hsv",
          "xChannel": "s",
          "yChannel": "v",
          "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
          "onUpdate:color": (v: Color) => emit("update:color", v),
          "onChange": (v: Color) => emit("change", v),
          "onChangeEnd": (v: Color) => emit("changeEnd", v),
          ...extra,
        }, { default: () => h(ColorTriangleThumb) });
    },
  });
}

/**
 * `getBoundingClientRect` reports a zero-sized box in this environment, which
 * would make every pointer coordinate degenerate. Stub a 100x100 box at the
 * origin so normalized coordinates are simply clientX/100, clientY/100.
 */
function stubRootRect(root: DOMWrapper<HTMLElement>) {
  root.element.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 100,
    bottom: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    toJSON() { return {}; },
  }) as DOMRect;
}

/** Display-space [x, y] of the most recent `update:modelValue` payload. */
function lastXY(wrapper: VueWrapper): [number, number] {
  const events = wrapper.emitted("update:modelValue")!;
  const color = events[events.length - 1]![0] as Color;
  const hsv = color.to("hsv");
  return [Math.round(hsv.get("s") * 100), Math.round(hsv.get("v") * 100)];
}

function lastZ(wrapper: VueWrapper): number {
  const events = wrapper.emitted("update:modelValue")!;
  const color = events[events.length - 1]![0] as Color;
  return Math.round(color.to("hsv").get("h"));
}

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockImplementation(id => id);
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();

describe("given a two-channel ColorTriangle", () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(makeTriangle(), { attachTo: document.body });
  });

  it("should render exactly one slider", () => {
    expect(wrapper.findAll("[role=\"slider\"]")).toHaveLength(1);
  });

  it("should label the thumb with human channel names, not raw keys", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-label")).toBe("Saturation, Brightness");
    expect(thumb.attributes("aria-roledescription")).toBe("Color thumb");
  });

  it("should describe the X channel with the ARIA value attributes", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    // Move Y off X first: at the mount value both channels read 50, so an
    // aria-valuenow wired to the wrong axis would still look correct.
    await thumb.trigger("keydown", { key: "ArrowUp", shiftKey: true });
    expect(thumb.attributes("aria-valuenow")).toBe("50");
    expect(thumb.attributes("aria-valuemin")).toBe("0");
    expect(thumb.attributes("aria-valuemax")).toBe("100");
    expect(thumb.attributes("aria-valuetext")).toBe("Saturation 50%, Brightness 60%");
  });

  it("should be focusable and carry no aria-disabled when enabled", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("tabindex")).toBe("0");
    expect(thumb.attributes("aria-disabled")).toBeUndefined();
    expect(wrapper.find("[data-color-triangle-root]").attributes("aria-disabled")).toBeUndefined();
  });

  it("arrowRight should move X, not Y", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    // The default (s=50, v=50) sits exactly on the triangle's hypotenuse
    // (u + w === 1), where an X step and a Y step both get clamped to the same
    // point and the assertion could not tell the two axes apart. Move to an
    // interior point first so the two key maps diverge.
    await thumb.trigger("keydown", { key: "ArrowUp", shiftKey: true });
    expect(lastXY(wrapper)).toEqual([50, 60]);

    await thumb.trigger("keydown", { key: "ArrowRight" });
    // The old, inverted map drove Y here and would report [50, 61].
    expect(lastXY(wrapper)).toEqual([51, 60]);
  });

  it("arrowLeft should move X down", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowLeft" });
    // The old, inverted map drove Y here and would report [49, 49].
    expect(lastXY(wrapper)).toEqual([49, 50]);
  });

  it("arrowUp should move Y, not X", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowUp" });
    // The old, inverted map drove X here and would report [51, 51].
    expect(lastXY(wrapper)).toEqual([50, 51]);
  });

  it("arrowDown should move Y down", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowDown" });
    // Y is the driven axis, so the in-triangle clamp gives way on X.
    // The old, inverted map drove X here and would report [49, 50].
    expect(lastXY(wrapper)).toEqual([49, 49]);
  });

  it("shift+arrowRight should move X by ten steps", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowRight", shiftKey: true });
    expect(lastXY(wrapper)[0]).toBe(60);
  });

  it("home should send X to its minimum and end to its maximum", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    await thumb.trigger("keydown", { key: "Home" });
    expect(lastXY(wrapper)[0]).toBe(0);
    await thumb.trigger("keydown", { key: "End" });
    expect(lastXY(wrapper)[0]).toBe(100);
  });

  it("should emit all four events on a keyboard step, with changeEnd exactly once", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
    expect(wrapper.emitted("update:color")).toHaveLength(1);
    expect(wrapper.emitted("change")).toHaveLength(1);
    expect(wrapper.emitted("changeEnd")).toHaveLength(1);
    expect(wrapper.emitted("changeEnd")![0]![0]).toBeInstanceOf(Color);
  });

  it("should emit nothing for a key that is not in the map", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("change")).toBeUndefined();
    expect(wrapper.emitted("changeEnd")).toBeUndefined();
  });

  it("should treat pageUp and pageDown as inert without a Z channel", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    await thumb.trigger("keydown", { key: "PageUp" });
    await thumb.trigger("keydown", { key: "PageDown" });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("changeEnd")).toBeUndefined();
  });

  it("should keep the thumb inside the triangle when driven at a corner", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    // Ten shifted steps is 100 display units of X — far past the point where
    // holding Y at 50 would leave the triangle.
    for (let i = 0; i < 10; i++)
      await thumb.trigger("keydown", { key: "ArrowRight", shiftKey: true });

    const [x, y] = lastXY(wrapper);
    expect(x).toBe(100);
    // u + w <= 1, i.e. x/100 + (100 - y)/100 <= 1. Without the in-triangle
    // clamp Y would still read 50 here and this sum would be 1.5.
    expect(x / 100 + (100 - y) / 100).toBeLessThanOrEqual(1.0001);
    expect(y).toBe(100);
  });

  it("should keep the thumb inside the triangle when Y is driven down", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    for (let i = 0; i < 10; i++)
      await thumb.trigger("keydown", { key: "ArrowDown", shiftKey: true });

    const [x, y] = lastXY(wrapper);
    expect(y).toBe(0);
    expect(x / 100 + (100 - y) / 100).toBeLessThanOrEqual(1.0001);
    expect(x).toBe(0);
  });

  describe("with pointer interaction", () => {
    it("should emit changeEnd exactly once for a drag that moves the value", async () => {
      const root = wrapper.find<HTMLElement>("[data-color-triangle-root]");
      stubRootRect(root);
      // (50, 40) is inside the triangle and away from the current value.
      await root.trigger("pointerdown", { pointerId: 1, clientX: 50, clientY: 40 });
      await root.trigger("pointerup", { pointerId: 1, clientX: 50, clientY: 40 });
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);
      expect(wrapper.emitted("change")).toBeTruthy();
    });

    it("should emit no changeEnd for a drag that does not move the value", async () => {
      const root = wrapper.find<HTMLElement>("[data-color-triangle-root]");
      stubRootRect(root);
      // Move away from the mount-time value first, so the second press is not
      // comparing against a stale snapshot that already matches.
      await root.trigger("pointerdown", { pointerId: 1, clientX: 50, clientY: 40 });
      await root.trigger("pointerup", { pointerId: 1, clientX: 50, clientY: 40 });
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);

      await root.trigger("pointerdown", { pointerId: 1, clientX: 50, clientY: 40 });
      await root.trigger("pointerup", { pointerId: 1, clientX: 50, clientY: 40 });
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);
    });
  });

  describe("when disabled", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
      wrapper = mount(makeTriangle({ disabled: true }), { attachTo: document.body });
    });

    it("should mark the root and thumb as disabled and drop the tab stop", () => {
      const root = wrapper.find("[data-color-triangle-root]");
      expect(root.attributes("aria-disabled")).toBe("true");
      const thumb = wrapper.find("[role=\"slider\"]");
      expect(thumb.attributes("aria-disabled")).toBe("true");
      expect(thumb.attributes("tabindex")).toBeUndefined();
    });

    it("should emit nothing on keydown", async () => {
      await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowRight" });
      expect(wrapper.emitted("update:modelValue")).toBeUndefined();
      expect(wrapper.emitted("changeEnd")).toBeUndefined();
    });
  });
});

describe("given a three-channel ColorTriangle", () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(makeTriangle({ zChannel: "h" }), { attachTo: document.body });
  });

  it("should still render exactly one slider", () => {
    expect(wrapper.findAll("[role=\"slider\"]")).toHaveLength(1);
  });

  it("should announce all three channels", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-label")).toBe("Saturation, Brightness, Hue");
    expect(thumb.attributes("aria-valuetext")).toBe("Saturation 50%, Brightness 50%, Hue 180°");
  });

  it("should still describe only the X channel with aria-valuenow/min/max", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    // Pull X, Y and Z apart first so a valuenow wired to the wrong axis shows.
    await thumb.trigger("keydown", { key: "ArrowRight", shiftKey: true });
    const [x, y] = lastXY(wrapper);
    expect(x).not.toBe(y);
    expect(thumb.attributes("aria-valuenow")).toBe(String(x));
    expect(thumb.attributes("aria-valuemin")).toBe("0");
    // The bounds stay the X channel's, not the Z channel's 0-360.
    expect(thumb.attributes("aria-valuemax")).toBe("100");
  });

  it("pageUp should raise Z and renormalise X and Y proportionally", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    // The first press settles the barycentric coordinates onto the simplex.
    await thumb.trigger("keydown", { key: "PageUp" });
    const [x0, y0] = lastXY(wrapper);
    const z0 = lastZ(wrapper);
    expect(x0).toBe(y0);

    await thumb.trigger("keydown", { key: "PageUp", shiftKey: true });
    const [x1, y1] = lastXY(wrapper);
    const z1 = lastZ(wrapper);

    expect(z1).toBeGreaterThan(z0);
    expect(x1).toBeLessThan(x0);
    expect(x1).toBe(y1);
    expect(y1).toBeLessThan(y0);
  });

  it("pageDown should lower Z", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    await thumb.trigger("keydown", { key: "PageUp" });
    const z0 = lastZ(wrapper);
    await thumb.trigger("keydown", { key: "PageDown", shiftKey: true });
    expect(lastZ(wrapper)).toBeLessThan(z0);
  });

  it("arrowRight should still move X, not Z", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    await thumb.trigger("keydown", { key: "ArrowRight" });
    const before = lastXY(wrapper);
    await thumb.trigger("keydown", { key: "ArrowRight", shiftKey: true });
    expect(lastXY(wrapper)[0]).toBeGreaterThan(before[0]);
  });

  it("should emit all four events on a keyboard step", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "PageUp" });
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
    expect(wrapper.emitted("update:color")).toHaveLength(1);
    expect(wrapper.emitted("change")).toHaveLength(1);
    expect(wrapper.emitted("changeEnd")).toHaveLength(1);
  });

  it("should keep the barycentric coordinates on the simplex", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    for (let i = 0; i < 6; i++)
      await thumb.trigger("keydown", { key: "ArrowRight", shiftKey: true });

    const [x, y] = lastXY(wrapper);
    const z = lastZ(wrapper);
    const sum = x / 100 + y / 100 + z / 360;
    expect(sum).toBeGreaterThan(0.98);
    expect(sum).toBeLessThan(1.02);
  });
});
