import type { DOMWrapper, VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import {
  ColorAreaArea,
  ColorAreaRoot,
  ColorAreaThumb,
} from "../src/components/ColorArea";
import { handleSubmit } from "./utils";

const ColorArea = defineComponent({
  props: {
    disabled: { type: Boolean, default: false },
    invertedX: { type: Boolean, default: false },
    invertedY: { type: Boolean, default: false },
    yChannel: { type: String, default: "s" },
  },
  emits: ["update:modelValue", "update:color", "change", "changeEnd"],
  setup(props, { emit }) {
    return () =>
      h(ColorAreaRoot, {
        "defaultValue": "hsl(180, 50%, 50%)",
        "colorSpace": "hsl",
        "xChannel": "h",
        "yChannel": props.yChannel,
        "disabled": props.disabled,
        "invertedX": props.invertedX,
        "invertedY": props.invertedY,
        "name": "slider-area",
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onUpdate:color": (v: Color) => emit("update:color", v),
        "onChange": (v: Color) => emit("change", v),
        "onChangeEnd": (v: Color) => emit("changeEnd", v),
      }, {
        default: () => h(ColorAreaArea, null, { default: () => h(ColorAreaThumb) }),
      });
  },
});

// Helper to extract emitted Color as [xDisplayValue, yDisplayValue]
// For hsl with xChannel=h, yChannel=s: h is 0-360 (degree), s is 0-100 (percentage)
function getEmittedDisplayValues(wrapper: VueWrapper, eventIndex = 0): [number, number] | undefined {
  const emitted = wrapper.emitted("update:modelValue")?.[eventIndex]?.[0] as Color | undefined;
  if (!emitted) return undefined;
  const hsl = emitted.to("hsl");
  const h = Math.round(hsl.get("h"));
  const s = Math.round(hsl.get("s") * 100);
  return [h, s];
}

describe("given default ColorArea", () => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockImplementation(id => id);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();

  let wrapper: VueWrapper<InstanceType<typeof ColorArea>>;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(ColorArea, { props: { disabled: false }, attachTo: document.body });
  });

  it("should have a single thumb with role=slider and 2D slider role description", () => {
    const thumb = wrapper.find("[role=\"slider\"][aria-roledescription=\"2D slider\"]");
    expect(thumb.exists()).toBe(true);
    expect(thumb.attributes("aria-valuenow")).toBe("180");
    expect(thumb.attributes("aria-valuemin")).toBe("0");
    expect(thumb.attributes("aria-valuemax")).toBe("360");
  });

  it("should have tabindex 0 on the thumb when enabled", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("tabindex")).toBe("0");
  });

  it("should not render aria-disabled when enabled", () => {
    const root = wrapper.find("[role=\"group\"]");
    expect(root.exists()).toBe(true);
    expect(root.attributes("aria-disabled")).toBeUndefined();
  });

  it("should expose the interaction surface as an application region", () => {
    const area = wrapper.find("[role=\"application\"]");
    expect(area.exists()).toBe(true);
    expect(area.attributes("aria-roledescription")).toBe("Color picker");
  });

  it("should emit change and changeEnd alongside update:modelValue on a keyboard step", async () => {
    const slider = wrapper.find("[role=\"slider\"]");
    await slider.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
    expect(wrapper.emitted("change")).toHaveLength(1);
    expect(wrapper.emitted("changeEnd")).toHaveLength(1);
  });

  it("should respect a non-default yChannel", async () => {
    const local = mount(ColorArea, { props: { yChannel: "l" }, attachTo: document.body });
    const slider = local.find("[role=\"slider\"]");
    await slider.trigger("keydown", { key: "ArrowDown" });
    const emitted = local.emitted("update:modelValue")?.[0]?.[0] as Color;
    const hsl = emitted.to("hsl");
    // lightness moved, saturation did not
    expect(Math.round(hsl.get("l") * 100)).toBe(51);
    expect(Math.round(hsl.get("s") * 100)).toBe(50);
  });

  describe("when disabled", () => {
    beforeEach(async () => {
      await wrapper.setProps({ disabled: true });
    });

    it("should disable the thumb", () => {
      const thumb = wrapper.find("[aria-roledescription=\"2D slider\"]");
      expect(thumb.attributes("data-disabled")).toBe("");
    });

    it("should remove tabindex from the thumb", () => {
      const thumb = wrapper.find("[role=\"slider\"]");
      expect(thumb.attributes("tabindex")).toBeUndefined();
    });
  });

  describe("after pressing navigation key", () => {
    let slider: DOMWrapper<HTMLElement>;

    beforeEach(() => {
      slider = wrapper.find("[role=\"slider\"]");
    });

    it("arrowRight should increase X (hue) by 1", async () => {
      await slider.trigger("keydown", { key: "ArrowRight" });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([181, 50]);
    });

    it("arrowLeft should decrease X (hue) by 1", async () => {
      await slider.trigger("keydown", { key: "ArrowLeft" });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([179, 50]);
    });

    it("arrowUp should decrease Y (saturation) by 1", async () => {
      await slider.trigger("keydown", { key: "ArrowUp" });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([180, 49]);
    });

    it("arrowDown should increase Y (saturation) by 1", async () => {
      await slider.trigger("keydown", { key: "ArrowDown" });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([180, 51]);
    });

    it("pageUp should set Y to min", async () => {
      await slider.trigger("keydown", { key: "PageUp" });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([180, 0]);
    });

    it("pageDown should set Y to max", async () => {
      await slider.trigger("keydown", { key: "PageDown" });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([180, 100]);
    });

    it("home should set X to 0", async () => {
      await slider.trigger("keydown", { key: "Home" });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([0, 50]);
    });

    it("end should set X to max", async () => {
      await slider.trigger("keydown", { key: "End" });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([360, 50]);
    });
  });

  describe("after pressing shift+arrow key", () => {
    let slider: DOMWrapper<HTMLElement>;

    beforeEach(() => {
      slider = wrapper.find("[role=\"slider\"]");
    });

    it("shift+arrowRight should increase X by 10", async () => {
      await slider.trigger("keydown", { key: "ArrowRight", shiftKey: true });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([190, 50]);
    });

    it("shift+arrowLeft should decrease X by 10", async () => {
      await slider.trigger("keydown", { key: "ArrowLeft", shiftKey: true });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([170, 50]);
    });

    it("shift+arrowUp should decrease Y by 10", async () => {
      await slider.trigger("keydown", { key: "ArrowUp", shiftKey: true });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([180, 40]);
    });

    it("shift+arrowDown should increase Y by 10", async () => {
      await slider.trigger("keydown", { key: "ArrowDown", shiftKey: true });
      const vals = getEmittedDisplayValues(wrapper);
      expect(vals).toEqual([180, 60]);
    });
  });

  describe("pointer interaction on the interaction surface", () => {
    // happy-dom gives every element a zero-size getBoundingClientRect, which
    // makes the area's linear scales divide by zero and produce NaN. Stub a
    // realistic box so pointer coordinates map to real channel values.
    // Default color is hsl(180, 50%, 50%) -> internal display values [180, 50]
    // (h: 0-360, s: 0-100). With rect { left: 0, top: 0, width: 200, height: 100 }
    // and no inversion, clientX=100/clientY=50 maps back to exactly [180, 50],
    // i.e. "no movement" from the starting value.
    //
    // Note: the pointer maths in ColorAreaRoot.vue's getPointFromPointerEvent
    // reads getBoundingClientRect() off the ROOT element (role="group"), not
    // the interaction surface (role="application") that ColorAreaArea.vue
    // renders and attaches the pointer listeners to. The rect must be stubbed
    // on the root.
    function stubAreaRect(w: VueWrapper) {
      const root = w.find("[role=\"group\"]").element as HTMLElement;
      root.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 200,
        bottom: 100,
        width: 200,
        height: 100,
        x: 0,
        y: 0,
        toJSON() { return {}; },
      });
    }

    it("should expose no data-disabled/aria-disabled on the application region when enabled", () => {
      const area = wrapper.find("[role=\"application\"]");
      expect(area.attributes("data-disabled")).toBeUndefined();
      expect(area.attributes("aria-disabled")).toBeUndefined();
    });

    it("should emit changeEnd exactly once for a full drag", async () => {
      const area = wrapper.find<HTMLElement>("[role=\"application\"]");
      stubAreaRect(wrapper);
      await area.trigger("pointerdown", { pointerId: 1, clientX: 100, clientY: 50 });
      await area.trigger("pointermove", { pointerId: 1, clientX: 150, clientY: 70 });
      await area.trigger("pointerup", { pointerId: 1, clientX: 150, clientY: 70 });
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);
    });

    it("should not emit changeEnd when a drag does not move the value", async () => {
      const area = wrapper.find<HTMLElement>("[role=\"application\"]");
      stubAreaRect(wrapper);

      // First, drag the value away from its initial position. This is
      // essential to the test: valuesBeforeSlideStartRef is initialized once,
      // at mount, to the starting value. If the second drag below happened to
      // be the FIRST interaction, a snapshotValues() that did nothing at all
      // would be indistinguishable from a working one, because the stale
      // mount-time snapshot would coincidentally already equal the pre-drag
      // value. Moving the value first, then dragging without moving it
      // further, is what actually exercises snapshotValues() re-capturing the
      // baseline on every slide start.
      await area.trigger("pointerdown", { pointerId: 1, clientX: 150, clientY: 70 });
      await area.trigger("pointerup", { pointerId: 1, clientX: 150, clientY: 70 });
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);

      // Second drag starts and ends at the same point the value is now at:
      // no movement, so no additional changeEnd should fire.
      await area.trigger("pointerdown", { pointerId: 1, clientX: 150, clientY: 70 });
      await area.trigger("pointerup", { pointerId: 1, clientX: 150, clientY: 70 });
      expect(wrapper.emitted("changeEnd")).toHaveLength(1);
    });

    it("should focus the thumb without starting a slide when pointerdown lands on it", async () => {
      stubAreaRect(wrapper);
      const thumb = wrapper.find("[role=\"slider\"]");
      // Use coordinates that map to a different point than the current value
      // ([180, 50]): if pointerdown on the thumb incorrectly fell through to
      // handleSlideStart, this would produce a "change" emission we can catch.
      // Coordinates that happen to coincide with the current value would make
      // this assertion pass even if the thumb-guard were broken.
      await thumb.trigger("pointerdown", { pointerId: 1, clientX: 150, clientY: 70 });
      expect(document.activeElement).toBe(thumb.element);
      expect(wrapper.emitted("change")).toBeUndefined();
      expect(wrapper.emitted("changeEnd")).toBeUndefined();
    });

    describe("when disabled", () => {
      beforeEach(async () => {
        await wrapper.setProps({ disabled: true });
      });

      it("should mark the application region as disabled", () => {
        const area = wrapper.find("[role=\"application\"]");
        expect(area.attributes("data-disabled")).toBe("");
        expect(area.attributes("aria-disabled")).toBe("true");
      });

      it("should emit nothing for a pointerdown/move/up sequence", async () => {
        const area = wrapper.find<HTMLElement>("[role=\"application\"]");
        stubAreaRect(wrapper);
        await area.trigger("pointerdown", { pointerId: 1, clientX: 150, clientY: 70 });
        await area.trigger("pointermove", { pointerId: 1, clientX: 170, clientY: 90 });
        await area.trigger("pointerup", { pointerId: 1, clientX: 170, clientY: 90 });
        expect(wrapper.emitted("change")).toBeUndefined();
        expect(wrapper.emitted("changeEnd")).toBeUndefined();
        expect(wrapper.emitted("update:modelValue")).toBeUndefined();
      });
    });
  });
});

describe("given slider area in a form", () => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockImplementation(id => id);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();

  let wrapper: VueWrapper;

  const FormWrapper = defineComponent({
    props: { handleSubmit: { type: Function, default: undefined } },
    setup(props) {
      return () => h("form", { onSubmit: props.handleSubmit }, [h(ColorArea)]);
    },
  });

  beforeEach(() => {
    handleSubmit.mockClear();
    document.body.innerHTML = "";
    wrapper = mount(FormWrapper, {
      props: { handleSubmit },
      attachTo: document.body,
    });
  });

  it("should have hidden input field", async () => {
    expect(wrapper.find("[type=\"hidden\"]").exists()).toBe(true);
  });

  describe("after clicking submit button", () => {
    beforeEach(async () => {
      await wrapper.find("form").trigger("submit");
    });

    it("should trigger submit once", () => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      // The hidden input now contains the Color's string representation
      const result = handleSubmit.mock.results[0]!.value as Record<string, string>;
      expect(result["slider-area"]).toBeDefined();
    });
  });
});
