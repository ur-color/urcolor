import type { DOMWrapper, VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import "internationalized-color/css";
import { Color } from "internationalized-color";
import {
  ColorAreaRoot,
  ColorAreaThumb,
  ColorAreaThumbX,
  ColorAreaThumbY,
  ColorAreaTrack,
} from "../src/components/ColorArea";
import { handleSubmit } from "./utils";

const ColorArea = defineComponent({
  props: {
    disabled: { type: Boolean, default: false },
    invertedX: { type: Boolean, default: false },
    invertedY: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "valueCommit"],
  setup(props, { emit }) {
    return () =>
      h(ColorAreaRoot, {
        "defaultValue": "hsl(180, 50%, 50%)",
        "colorSpace": "hsl",
        "xChannel": "h",
        "yChannel": "s",
        "disabled": props.disabled,
        "invertedX": props.invertedX,
        "invertedY": props.invertedY,
        "name": "slider-area",
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onValueCommit": (v: Color) => emit("valueCommit", v),
      }, {
        default: () =>
          h(ColorAreaTrack, null, {
            default: () =>
              h(ColorAreaThumb, null, {
                default: () => [
                  h(ColorAreaThumbX),
                  h(ColorAreaThumbY),
                ],
              }),
          }),
      });
  },
});

// Helper to extract emitted Color as [xDisplayValue, yDisplayValue]
// For hsl with xChannel=h, yChannel=s: h is 0-360 (degree), s is 0-100 (percentage)
function getEmittedDisplayValues(wrapper: VueWrapper, eventIndex = 0): [number, number] | undefined {
  const emitted = wrapper.emitted("update:modelValue")?.[eventIndex]?.[0] as Color | undefined;
  if (!emitted) return undefined;
  const hsl = emitted.to("hsl");
  if (!hsl) return undefined;
  const h = Math.round(hsl.get("h", 0));
  const s = Math.round(hsl.get("s", 0) * 100);
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

  it("should have 2D slider role description on the thumb group", () => {
    const group = wrapper.find("[aria-roledescription=\"2D slider\"]");
    expect(group.exists()).toBe(true);
  });

  it("should have a horizontal ThumbX with correct ARIA attributes", () => {
    const thumbX = wrapper.find("[role=\"slider\"][aria-orientation=\"horizontal\"]");
    expect(thumbX.exists()).toBe(true);
    expect(thumbX.attributes("aria-valuenow")).toBe("180");
    expect(thumbX.attributes("aria-valuemin")).toBe("0");
    expect(thumbX.attributes("aria-valuemax")).toBe("360");
  });

  it("should have a vertical ThumbY with correct ARIA attributes", () => {
    const thumbY = wrapper.find("[role=\"slider\"][aria-orientation=\"vertical\"]");
    expect(thumbY.exists()).toBe(true);
    expect(thumbY.attributes("aria-valuenow")).toBe("50");
    expect(thumbY.attributes("aria-valuemin")).toBe("0");
    expect(thumbY.attributes("aria-valuemax")).toBe("100");
  });

  describe("roving tabindex", () => {
    it("should have tabindex 0 on ThumbX and -1 on ThumbY by default (activeDirection=x)", () => {
      const thumbX = wrapper.find("[role=\"slider\"][aria-orientation=\"horizontal\"]");
      const thumbY = wrapper.find("[role=\"slider\"][aria-orientation=\"vertical\"]");
      expect(thumbX.attributes("tabindex")).toBe("0");
      expect(thumbY.attributes("tabindex")).toBe("-1");
    });

    it("should switch tabindex when pressing Down arrow (activeDirection switches to y)", async () => {
      const thumbX = wrapper.find("[role=\"slider\"][aria-orientation=\"horizontal\"]");
      await thumbX.trigger("keydown", { key: "ArrowDown" });
      const thumbXAfter = wrapper.find("[role=\"slider\"][aria-orientation=\"horizontal\"]");
      const thumbYAfter = wrapper.find("[role=\"slider\"][aria-orientation=\"vertical\"]");
      expect(thumbXAfter.attributes("tabindex")).toBe("-1");
      expect(thumbYAfter.attributes("tabindex")).toBe("0");
    });

    it("should switch back to x when pressing Right arrow after being on y", async () => {
      const thumbX = wrapper.find("[role=\"slider\"][aria-orientation=\"horizontal\"]");
      await thumbX.trigger("keydown", { key: "ArrowDown" });
      const thumbY = wrapper.find("[role=\"slider\"][aria-orientation=\"vertical\"]");
      await thumbY.trigger("keydown", { key: "ArrowRight" });
      const thumbXAfter = wrapper.find("[role=\"slider\"][aria-orientation=\"horizontal\"]");
      const thumbYAfter = wrapper.find("[role=\"slider\"][aria-orientation=\"vertical\"]");
      expect(thumbXAfter.attributes("tabindex")).toBe("0");
      expect(thumbYAfter.attributes("tabindex")).toBe("-1");
    });
  });

  describe("when disabled", () => {
    beforeEach(async () => {
      await wrapper.setProps({ disabled: true });
    });

    it("should disable the thumb group", () => {
      const group = wrapper.find("[aria-roledescription=\"2D slider\"]");
      expect(group.attributes("data-disabled")).toBe("");
    });

    it("should remove tabindex from both thumbs", () => {
      const thumbX = wrapper.find("[role=\"slider\"][aria-orientation=\"horizontal\"]");
      const thumbY = wrapper.find("[role=\"slider\"][aria-orientation=\"vertical\"]");
      expect(thumbX.attributes("tabindex")).toBeUndefined();
      expect(thumbY.attributes("tabindex")).toBeUndefined();
    });
  });

  describe("when enabled", () => {
    it("should have tabindex on ThumbX (active direction)", () => {
      const thumbX = wrapper.find("[role=\"slider\"][aria-orientation=\"horizontal\"]");
      expect(thumbX.attributes("tabindex")).toBe("0");
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
