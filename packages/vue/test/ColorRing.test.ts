import type { VueWrapper } from "@vue/test-utils";
import { DOMWrapper, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { ColorRingRoot, ColorRingThumb, ColorRingTrack } from "../src/components/ColorRing";

const ColorRing = defineComponent({
  props: { disabled: { type: Boolean, default: false } },
  emits: ["update:modelValue", "update:color", "change", "changeEnd"],
  setup(props, { emit }) {
    return () =>
      h(ColorRingRoot, {
        "defaultValue": "hsl(180, 50%, 50%)",
        "colorSpace": "hsl",
        "channel": "h",
        "disabled": props.disabled,
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onUpdate:color": (v: Color) => emit("update:color", v),
        "onChange": (v: Color) => emit("change", v),
        "onChangeEnd": (v: Color) => emit("changeEnd", v),
      }, { default: () => h(ColorRingTrack, null, { default: () => h(ColorRingThumb) }) });
  },
});

// Helper to extract emitted Color's hue display value (0-360, degree format).
function getEmittedHue(wrapper: VueWrapper, eventIndex = 0): number | undefined {
  const emitted = wrapper.emitted("update:modelValue")?.[eventIndex]?.[0] as Color | undefined;
  if (!emitted) return undefined;
  return Math.round(emitted.to("hsl").get("h"));
}

// happy-dom gives every element a zero-size getBoundingClientRect, which makes
// the ring's polar coordinate maths (center/radius derived from the rect)
// produce NaN/degenerate results. ColorRingRoot.vue's getValueFromPointer and
// handlePointerDown both measure `currentElement.value.getBoundingClientRect()`
// - the ROOT Primitive itself. In this test's ColorRing wrapper that's the
// outermost rendered node, i.e. `wrapper.element`. Stub a 200x200 box centered
// at (100, 100) with outer radius 100, matching ColorWheel.test.ts's idiom.
function stubRootRect(w: VueWrapper) {
  const root = w.element as HTMLElement;
  root.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 200,
    bottom: 200,
    width: 200,
    height: 200,
    x: 0,
    y: 0,
    toJSON() { return {}; },
  });
}

// Flush the requestAnimationFrame that ColorRingRoot's handlePointerMove
// schedules (happy-dom mocks rAF with a real ~timeout, not a microtask).
function flushRaf() {
  return new Promise(resolve => setTimeout(resolve, 20));
}

describe("given default ColorRing", () => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockImplementation(id => id);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();

  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(ColorRing, { attachTo: document.body });
  });

  it("should label the thumb with the channel name", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-label")).toBe("Hue");
    expect(thumb.attributes("aria-valuetext")).toBe("180°");
  });

  it("should be tabbable when enabled", () => {
    expect(wrapper.find("[role=\"slider\"]").attributes("tabindex")).toBe("0");
  });

  describe("when disabled", () => {
    beforeEach(async () => {
      await wrapper.setProps({ disabled: true });
    });

    it("should drop out of the tab order", () => {
      expect(wrapper.find("[role=\"slider\"]").attributes("tabindex")).toBeUndefined();
    });
  });

  describe("the four-event contract on a keyboard step", () => {
    it("should emit update:modelValue, update:color, change and changeEnd, with changeEnd exactly once", async () => {
      const slider = wrapper.find("[role=\"slider\"]");
      await slider.trigger("keydown", { key: "ArrowRight" });
      expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
      expect(wrapper.emitted("update:color")).toHaveLength(1);
      expect(wrapper.emitted("change")).toHaveLength(1);
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);
    });
  });

  describe("a keyboard interaction that cannot change the value", () => {
    it("should emit nothing for an unhandled key", async () => {
      const slider = wrapper.find("[role=\"slider\"]");
      // handleKeyDown's if/else chain only recognizes Arrow*/PageUp/PageDown/
      // Home/End; anything else falls to `else return;` before ever calling
      // updateValue, so this genuinely cannot move the value.
      await slider.trigger("keydown", { key: "a" });
      expect(wrapper.emitted("update:modelValue")).toBeUndefined();
      expect(wrapper.emitted("update:color")).toBeUndefined();
      expect(wrapper.emitted("change")).toBeUndefined();
      expect(wrapper.emitted("changeEnd")).toBeUndefined();
    });
  });

  describe("cyclic wrap on the hue channel", () => {
    it("should wrap below the minimum to near the maximum instead of clamping to the minimum", async () => {
      const slider = wrapper.find("[role=\"slider\"]");

      // Drive hue to its minimum (0) first.
      await slider.trigger("keydown", { key: "Home" });
      expect(getEmittedHue(wrapper, 0)).toBe(0);

      // Stepping further down from 0 must cyclicWrap to just under 360
      // (360 - step = 359), not clamp back to 0. If cyclicWrap were dropped
      // in favor of a plain clamp, this would instead stay at 0.
      await slider.trigger("keydown", { key: "ArrowDown" });
      const hue = getEmittedHue(wrapper, 1);
      expect(hue).toBe(359);
      expect(hue).not.toBe(0);
    });
  });

  describe("shift+arrow", () => {
    it("should multiply the step by 10", async () => {
      const slider = wrapper.find("[role=\"slider\"]");
      await slider.trigger("keydown", { key: "ArrowUp", shiftKey: true });
      expect(getEmittedHue(wrapper)).toBe(190);
    });
  });

  describe("the hasChanged emit gate", () => {
    it("should emit nothing on a second Home press once already at the hue minimum", async () => {
      const slider = wrapper.find("[role=\"slider\"]");

      // First Home press genuinely moves the value: default is 180, Home
      // drives it to hueMin = 0.
      await slider.trigger("keydown", { key: "Home" });
      expect(getEmittedHue(wrapper)).toBe(0);
      expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);

      // Second Home press targets the same hueMin the value is already at,
      // so updateValue's hasChanged check is false and the whole emit block
      // (including changeEnd) must be skipped.
      await slider.trigger("keydown", { key: "Home" });
      expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
      expect(wrapper.emitted("update:color")).toHaveLength(1);
      expect(wrapper.emitted("change")).toHaveLength(1);
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);
    });
  });

  describe("pointer interaction on the ring", () => {
    it("should emit changeEnd exactly once for a drag that moves the value", async () => {
      stubRootRect(wrapper);
      const root = new DOMWrapper(wrapper.element as HTMLElement);

      // Center (100, 100), outer radius 100, inner radius 70 (innerRadius
      // default 0.7). clientX=185,clientY=100 is 85px right of center, which
      // is inside the annulus band (between 70 and 100) -> angle 90 (0 = top,
      // clockwise), hue = 90. That differs from the default value's hue
      // (180), so the drag start alone already changes the value.
      await root.trigger("pointerdown", { pointerId: 1, clientX: 185, clientY: 100 });
      // Move to a point 85px left of center -> angle 270, still on the band.
      await root.trigger("pointermove", { pointerId: 1, clientX: 15, clientY: 100 });
      await flushRaf();
      await root.trigger("pointerup", { pointerId: 1, clientX: 15, clientY: 100 });

      expect(wrapper.emitted("changeEnd")).toHaveLength(1);
    });

    it("should not emit changeEnd for a drag that does not move the value", async () => {
      stubRootRect(wrapper);
      const root = new DOMWrapper(wrapper.element as HTMLElement);

      // First, drag the value away from its initial position. This is
      // essential: the value-before-slide snapshot is taken fresh on every
      // pointerdown, so if the second drag below were the FIRST interaction,
      // a broken snapshot that did nothing at all would be indistinguishable
      // from a working one.
      await root.trigger("pointerdown", { pointerId: 1, clientX: 185, clientY: 100 });
      await root.trigger("pointerup", { pointerId: 1, clientX: 185, clientY: 100 });
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);

      // Second drag starts and ends at the same point the value is now at
      // (hue 90): no movement, so no additional changeEnd.
      await root.trigger("pointerdown", { pointerId: 1, clientX: 185, clientY: 100 });
      await root.trigger("pointerup", { pointerId: 1, clientX: 185, clientY: 100 });
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);
    });
  });

  describe("the annulus hit test", () => {
    it("should reject a pointerdown in the hole at the centre: no drag, no emit", async () => {
      stubRootRect(wrapper);
      const root = new DOMWrapper(wrapper.element as HTMLElement);

      // (100, 50) is 50px directly above the centre (100, 100) - distance 50,
      // well inside the inner radius (70) -> handlePointerDown's annulus
      // check returns before starting a drag or calling updateValue. This
      // point is deliberately NOT dead-centre (100, 100): dx=0, dy=0 is a
      // degenerate case for cartesianToPolar's atan2(0, -0), and it happens
      // to resolve to angle 180 - the same as the default hue (180) - which
      // would make this assertion pass even if the annulus check were
      // deleted entirely (updateValue would see hasChanged=false and still
      // emit nothing, for the wrong reason). Using a point straight up
      // (angle 0, hue 0) guarantees the value would visibly change to 0 if
      // the rejection were missing, so "no emit" only holds if the check
      // actually runs.
      await root.trigger("pointerdown", { pointerId: 1, clientX: 100, clientY: 50 });
      await root.trigger("pointerup", { pointerId: 1, clientX: 100, clientY: 50 });

      expect(wrapper.emitted("update:modelValue")).toBeUndefined();
      expect(wrapper.emitted("change")).toBeUndefined();
      expect(wrapper.emitted("changeEnd")).toBeUndefined();
    });

    it("should accept a pointerdown on the band between the radii", async () => {
      stubRootRect(wrapper);
      const root = new DOMWrapper(wrapper.element as HTMLElement);

      // 85px right of centre: between the inner radius (70) and outer radius
      // (100) -> accepted, starts a drag, and moves the value from 180 to 90.
      await root.trigger("pointerdown", { pointerId: 1, clientX: 185, clientY: 100 });
      await root.trigger("pointerup", { pointerId: 1, clientX: 185, clientY: 100 });

      expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
      expect(getEmittedHue(wrapper)).toBe(90);
    });
  });
});
