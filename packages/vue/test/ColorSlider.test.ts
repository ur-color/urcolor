import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { ColorSliderRoot, ColorSliderThumb, ColorSliderTrack, injectColorSliderRootContext } from "../src/components/ColorSlider";

const ColorSlider = defineComponent({
  props: { disabled: { type: Boolean, default: false } },
  emits: ["update:modelValue", "change", "changeEnd"],
  setup(props, { emit }) {
    return () =>
      h(ColorSliderRoot, {
        "defaultValue": "hsl(180, 50%, 50%)",
        "colorSpace": "hsl",
        "channel": "h",
        "name": "hue",
        "disabled": props.disabled,
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onChange": (v: Color) => emit("change", v),
        "onChangeEnd": (v: Color) => emit("changeEnd", v),
      }, { default: () => h(ColorSliderTrack, null, { default: () => h(ColorSliderThumb) }) });
  },
});

// A probe rendered inside ColorSliderRoot's default slot so the isDragging
// context member can be observed from the outside without touching
// ColorSliderGradient (Task 10's concern) and without asserting on internals.
const DraggingProbe = defineComponent({
  setup() {
    const context = injectColorSliderRootContext();
    return () => h("div", { "data-testid": "dragging-probe", "data-dragging": String(context.isDragging.value) });
  },
});

const ColorSliderWithProbe = defineComponent({
  setup() {
    return () =>
      h(ColorSliderRoot, {
        defaultValue: "hsl(180, 50%, 50%)",
        colorSpace: "hsl",
        channel: "h",
      }, {
        default: () => [
          h(ColorSliderTrack, null, { default: () => h(ColorSliderThumb) }),
          h(DraggingProbe),
        ],
      });
  },
});

describe("given default ColorSlider", () => {
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
    wrapper = mount(ColorSlider, { attachTo: document.body });
  });

  it("should seed from defaultValue when uncontrolled", () => {
    expect(wrapper.find("[role=\"slider\"]").attributes("aria-valuenow")).toBe("180");
  });

  it("should emit change and changeEnd on a keyboard step", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("change")).toBeTruthy();
    expect(wrapper.emitted("changeEnd")).toBeTruthy();
  });

  it("should emit changeEnd exactly once for a single keyboard step", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("changeEnd")).toHaveLength(1);
  });

  it("should emit the full four-event contract on a keyboard step", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("change")).toBeTruthy();
    expect(wrapper.emitted("changeEnd")).toBeTruthy();
    const [color] = wrapper.emitted("update:modelValue")![0] as [Color];
    expect(color).toBeInstanceOf(Color);
  });

  it("should not render a hidden input when not inside a form", () => {
    expect(wrapper.find("input[name=\"hue\"]").exists()).toBe(false);
  });
});

describe("given a ColorSlider in a form", () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(defineComponent({
      setup() {
        return () => h("form", [h(ColorSlider)]);
      },
    }), { attachTo: document.body });
  });

  it("should render a hidden input", () => {
    expect(wrapper.find("input[name=\"hue\"]").exists()).toBe(true);
  });

  it("should carry the current colour on the hidden input", () => {
    const input = wrapper.find<HTMLInputElement>("input[name=\"hue\"]");
    expect(input.element.value).toBe(Color.parse("hsl(180, 50%, 50%)")!.toString());
  });
});

describe("given a ColorSlider used with as/asChild", () => {
  // `wrapper.element` falls back to the mount container (a plain <div>) as
  // soon as the component has more than one root node — which it always
  // does here, because of the `v-if` comment placeholder for the hidden
  // form input. That fallback happens to be a <div> itself, so asserting
  // on `wrapper.element.tagName` would pass vacuously for `as: "div"`
  // regardless of whether the prop is wired up. Query for the retagged
  // element directly instead, and pick a tag ("button") that could never
  // coincide with the test-utils container.
  it("should render the tag passed via `as`", () => {
    const wrapper = mount(ColorSliderRoot, {
      props: { as: "button", defaultValue: "hsl(180, 50%, 50%)" },
    });
    const el = wrapper.find("button");
    expect(el.exists()).toBe(true);
    expect(el.attributes("data-slider-impl")).toBeDefined();
  });

  it("should render the child's own tag when asChild is used", () => {
    const wrapper = mount(ColorSliderRoot, {
      props: { asChild: true, defaultValue: "hsl(180, 50%, 50%)" },
      slots: {
        default: () => h("button", { "type": "button", "data-marker": "slider" }, "slider"),
      },
    });
    const el = wrapper.find("button[data-marker=\"slider\"]");
    expect(el.exists()).toBe(true);
    // Prove the primitive's own attributes were merged onto the user's
    // element, rather than a separate <span> being rendered alongside it.
    expect(el.attributes("data-slider-impl")).toBeDefined();
    expect(wrapper.find("span").exists()).toBe(false);
  });
});

describe("given a ColorSlider with a dragging probe", () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(ColorSliderWithProbe, { attachTo: document.body });
  });

  it("should flip isDragging on pointerdown and back on pointerup", async () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(wrapper.find("[data-testid=\"dragging-probe\"]").attributes("data-dragging")).toBe("false");

    await thumb.trigger("pointerdown", { pointerId: 1 });
    expect(wrapper.find("[data-testid=\"dragging-probe\"]").attributes("data-dragging")).toBe("true");

    await thumb.trigger("pointerup", { pointerId: 1 });
    expect(wrapper.find("[data-testid=\"dragging-probe\"]").attributes("data-dragging")).toBe("false");
  });
});
