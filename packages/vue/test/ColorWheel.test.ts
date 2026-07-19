import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { ColorWheelRoot, ColorWheelThumb } from "../src/components/ColorWheel";

const ColorWheel = defineComponent({
  props: { disabled: { type: Boolean, default: false } },
  emits: ["update:modelValue", "change", "changeEnd"],
  setup(props, { emit }) {
    return () =>
      h(ColorWheelRoot, {
        "defaultValue": "hsl(180, 50%, 50%)",
        "colorSpace": "hsl",
        "angleChannel": "h",
        "radiusChannel": "s",
        "disabled": props.disabled,
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onChange": (v: Color) => emit("change", v),
        "onChangeEnd": (v: Color) => emit("changeEnd", v),
      }, { default: () => h(ColorWheelThumb) });
  },
});

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
});
