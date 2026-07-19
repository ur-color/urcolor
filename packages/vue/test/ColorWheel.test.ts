import type { VueWrapper } from "@vue/test-utils";
import { DOMWrapper, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { ColorWheelRoot, ColorWheelThumb } from "../src/components/ColorWheel";

const ColorWheel = defineComponent({
  props: { disabled: { type: Boolean, default: false } },
  emits: ["update:modelValue", "update:color", "change", "changeEnd"],
  setup(props, { emit }) {
    return () =>
      h(ColorWheelRoot, {
        "defaultValue": "hsl(180, 50%, 50%)",
        "colorSpace": "hsl",
        "angleChannel": "h",
        "radiusChannel": "s",
        "disabled": props.disabled,
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onUpdate:color": (v: Color) => emit("update:color", v),
        "onChange": (v: Color) => emit("change", v),
        "onChangeEnd": (v: Color) => emit("changeEnd", v),
      }, { default: () => h(ColorWheelThumb) });
  },
});

// Helper to extract emitted Color as [hueDisplayValue, saturationDisplayValue]
// For hsl with angleChannel=h, radiusChannel=s: h is 0-360 (degree), s is 0-100 (percentage)
function getEmittedDisplayValues(wrapper: VueWrapper, eventIndex = 0): [number, number] | undefined {
  const emitted = wrapper.emitted("update:modelValue")?.[eventIndex]?.[0] as Color | undefined;
  if (!emitted) return undefined;
  const hsl = emitted.to("hsl");
  const h = Math.round(hsl.get("h"));
  const s = Math.round(hsl.get("s") * 100);
  return [h, s];
}

// happy-dom gives every element a zero-size getBoundingClientRect, which makes
// the wheel's polar coordinate maths (center/radius derived from the rect)
// produce NaN. ColorWheelRoot.vue's getValuesFromPointer/handlePointerDown
// both measure `currentElement.value.getBoundingClientRect()` - the ROOT
// Primitive itself (there is no separate interaction-surface child the way
// ColorArea has one). In this test's ColorWheel wrapper, the root Primitive
// is the outermost rendered node, i.e. `wrapper.element`. Stub a 200x200 box
// centered at (100, 100) with radius 100 so pointer coordinates map to real
// angle/radius values.
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

// Flush the requestAnimationFrame that ColorWheelRoot's handlePointerMove
// schedules (happy-dom mocks rAF with a real ~timeout, not a microtask).
function flushRaf() {
  return new Promise(resolve => setTimeout(resolve, 20));
}

describe("given default ColorWheel", () => {
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
    wrapper = mount(ColorWheel, { attachTo: document.body });
  });

  it("should render exactly one slider", () => {
    expect(wrapper.findAll("[role=\"slider\"]")).toHaveLength(1);
  });

  it("should label the thumb with both channel names", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-label")).toBe("Hue, Saturation");
    expect(thumb.attributes("aria-roledescription")).toBe("Color thumb");
    expect(thumb.attributes("aria-valuetext")).toBe("Hue 180°, Saturation 50%");
  });

  it("should expose the angle channel range on aria-valuemin/max/now", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-valuenow")).toBe("180");
    expect(thumb.attributes("aria-valuemin")).toBe("0");
    expect(thumb.attributes("aria-valuemax")).toBe("360");
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

  describe("after pressing an angle-channel navigation key", () => {
    let slider: DOMWrapper<HTMLElement>;

    beforeEach(() => {
      slider = wrapper.find("[role=\"slider\"]");
    });

    it("arrowRight should increase the angle channel (hue) by its configured step", async () => {
      await slider.trigger("keydown", { key: "ArrowRight" });
      expect(getEmittedDisplayValues(wrapper)).toEqual([181, 50]);
    });

    it("arrowLeft should decrease the angle channel (hue) by its configured step", async () => {
      await slider.trigger("keydown", { key: "ArrowLeft" });
      expect(getEmittedDisplayValues(wrapper)).toEqual([179, 50]);
    });

    it("shift+arrowRight should multiply the angle step by 10", async () => {
      await slider.trigger("keydown", { key: "ArrowRight", shiftKey: true });
      expect(getEmittedDisplayValues(wrapper)).toEqual([190, 50]);
    });

    it("shift+arrowLeft should multiply the angle step by 10", async () => {
      await slider.trigger("keydown", { key: "ArrowLeft", shiftKey: true });
      expect(getEmittedDisplayValues(wrapper)).toEqual([170, 50]);
    });
  });

  describe("after pressing a radius-channel navigation key", () => {
    let slider: DOMWrapper<HTMLElement>;

    beforeEach(() => {
      slider = wrapper.find("[role=\"slider\"]");
    });

    it("arrowUp should increase the radius channel (saturation) by its configured step", async () => {
      await slider.trigger("keydown", { key: "ArrowUp" });
      expect(getEmittedDisplayValues(wrapper)).toEqual([180, 51]);
    });

    it("arrowDown should decrease the radius channel (saturation) by its configured step", async () => {
      await slider.trigger("keydown", { key: "ArrowDown" });
      expect(getEmittedDisplayValues(wrapper)).toEqual([180, 49]);
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

  describe("the hasChanged emit gate", () => {
    it("should emit nothing on a second Home press once already at the angle/radius minimum", async () => {
      const slider = wrapper.find("[role=\"slider\"]");

      // First Home press genuinely moves the value: default is [180, 50],
      // Home drives it to [angleMin, radiusMin] = [0, 0].
      await slider.trigger("keydown", { key: "Home" });
      expect(getEmittedDisplayValues(wrapper)).toEqual([0, 0]);
      expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);

      // Second Home press targets the same [angleMin, radiusMin] the value is
      // already at, so updateValues' hasChanged check is false and the whole
      // emit block (including changeEnd) must be skipped - this is the only
      // key that is guaranteed to be a genuine no-op, since it doesn't depend
      // on step size or current position beyond "already at the minimum".
      await slider.trigger("keydown", { key: "Home" });
      expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
      expect(wrapper.emitted("update:color")).toHaveLength(1);
      expect(wrapper.emitted("change")).toHaveLength(1);
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);
    });
  });

  describe("cyclic wrap on the angle channel", () => {
    it("should wrap below the minimum to near the maximum instead of clamping to the minimum", async () => {
      const slider = wrapper.find("[role=\"slider\"]");

      // Drive the angle to its minimum (0) first.
      await slider.trigger("keydown", { key: "Home" });
      expect(getEmittedDisplayValues(wrapper, 0)).toEqual([0, 0]);

      // Stepping further down from 0 must cyclicWrap to just under 360
      // (360 - step = 359), not clamp back to 0. If cyclicWrap were dropped
      // in favor of a plain clamp, this would instead stay at 0.
      await slider.trigger("keydown", { key: "ArrowLeft" });
      const vals = getEmittedDisplayValues(wrapper, 1);
      expect(vals?.[0]).toBe(359);
      expect(vals?.[0]).not.toBe(0);
    });
  });

  describe("pointer interaction on the wheel", () => {
    it("should emit changeEnd exactly once for a drag that moves the value", async () => {
      stubRootRect(wrapper);
      const root = new DOMWrapper(wrapper.element as HTMLElement);

      // Center (100, 100), radius 100. clientX=150,clientY=100 is 50px to the
      // right of center -> angle 90 (0 = top, clockwise), radius 50/100 * 100
      // = 50. That differs from the default value's angle (180), so the drag
      // start alone already changes the value (matches ColorArea's idiom).
      await root.trigger("pointerdown", { pointerId: 1, clientX: 150, clientY: 100 });
      // Move to a point 50px left of center -> angle 270, radius still 50.
      await root.trigger("pointermove", { pointerId: 1, clientX: 50, clientY: 100 });
      await flushRaf();
      await root.trigger("pointerup", { pointerId: 1, clientX: 50, clientY: 100 });

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
      await root.trigger("pointerdown", { pointerId: 1, clientX: 150, clientY: 100 });
      await root.trigger("pointerup", { pointerId: 1, clientX: 150, clientY: 100 });
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);

      // Second drag starts and ends at the same point the value is now at
      // (angle 90, radius 50): no movement, so no additional changeEnd.
      await root.trigger("pointerdown", { pointerId: 1, clientX: 150, clientY: 100 });
      await root.trigger("pointerup", { pointerId: 1, clientX: 150, clientY: 100 });
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);
    });
  });
});
