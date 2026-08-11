import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import { ColorSwatchRoot } from "../src/components/ColorSwatch";
import { ColorFieldSwatch } from "../src/components/ColorField";

// Regression test for C1: the old `internationalized-color` library's `.to()`/`Color.from()`
// returned null/undefined on failure. `@urcolor/core`'s `Color.from` throws on invalid input
// instead. ColorSwatchRoot must not throw when given a bad color string — it should degrade
// gracefully to "transparent", matching the React implementation's `Color.parse(...) ?? null`.
describe("ColorSwatchRoot", () => {
  it("should not throw when model-value is an invalid color string", () => {
    expect(() => {
      mount(ColorSwatchRoot, { props: { modelValue: "not-a-color" } });
    }).not.toThrow();
  });

  it("should render as transparent when model-value is an invalid color string", () => {
    const wrapper: VueWrapper = mount(ColorSwatchRoot, { props: { modelValue: "not-a-color" } });
    const style = wrapper.attributes("style") ?? "";
    expect(style).toContain("--urcolor-swatch-color: transparent");
  });

  it("should still render a valid color string", () => {
    const wrapper: VueWrapper = mount(ColorSwatchRoot, { props: { modelValue: "red" } });
    const style = wrapper.attributes("style") ?? "";
    expect(style).not.toContain("--urcolor-swatch-color: transparent");
  });

  it("should accept a Color instance without re-parsing", () => {
    const color = Color.parse("hsl(210, 80%, 50%)")!;
    expect(() => {
      mount(ColorSwatchRoot, { props: { modelValue: color } });
    }).not.toThrow();
  });
});

describe("ColorSwatch accessible name", () => {
  it("should use the label prop when given", () => {
    const wrapper = mount(ColorSwatchRoot, { props: { modelValue: "#ff0000", label: "Brand red" } });
    expect(wrapper.attributes("aria-label")).toBe("Brand red");
    expect(wrapper.attributes("aria-roledescription")).toBe("color swatch");
  });

  it("should fall back to the colour string", () => {
    const wrapper = mount(ColorSwatchRoot, { props: { modelValue: "#ff0000" } });
    // Asserted exactly, not merely truthy: a fallback that collapsed to "transparent"
    // would announce every coloured swatch as transparent, which is the opposite of
    // the accessible name this component is supposed to expose.
    expect(wrapper.attributes("aria-label")).toBe("rgb(255 0 0)");
  });

  it("should mark an empty swatch with data-no-color", () => {
    const wrapper = mount(ColorSwatchRoot);
    expect(wrapper.attributes("data-no-color")).toBe("");
    expect(wrapper.attributes("aria-label")).toBe("transparent");
  });

  it("should expose colour and alpha to the slot", () => {
    const wrapper = mount(ColorSwatchRoot, {
      props: { modelValue: "rgb(255 0 0 / 0.5)", alpha: true },
      slots: { default: "<template #default=\"{ alpha }\"><span>{{ alpha }}</span></template>" },
    });
    expect(wrapper.text()).toBe("0.5");
  });
});

// Beyond the brief: data-no-color must react to the alpha channel, not just
// presence of a colour. A colour that resolves fully transparent (alpha 0)
// is functionally invisible, same as having no colour at all. A partially
// transparent colour is still visible and must not be flagged.
describe("ColorSwatch data-no-color and alpha", () => {
  it("should mark a fully transparent colour as data-no-color", () => {
    const wrapper = mount(ColorSwatchRoot, { props: { modelValue: "rgb(255 0 0 / 0)" } });
    expect(wrapper.attributes("data-no-color")).toBe("");
  });

  it("should not mark a partially transparent colour as data-no-color", () => {
    const wrapper = mount(ColorSwatchRoot, { props: { modelValue: "rgb(255 0 0 / 0.3)" } });
    expect(wrapper.attributes("data-no-color")).toBeUndefined();
  });

  // A colour that exists but is fully transparent still resolves a real
  // (non-"transparent") colorString — e.g. "rgb(255 0 0 / 0)" — so the
  // accessible name must go through its own hasColor gate rather than
  // relying on colorString's unrelated no-color fallback to coincidentally
  // produce the word "transparent".
  it("should announce a fully transparent colour as \"transparent\", not its raw colour string", () => {
    const wrapper = mount(ColorSwatchRoot, { props: { modelValue: "rgb(255 0 0 / 0)", alpha: true } });
    expect(wrapper.attributes("aria-label")).toBe("transparent");
  });

  // colorString resolves differently depending on `alpha`: when alpha is
  // false the swatch always renders the fully-opaque colour (no alpha
  // component in the string); when alpha is true it renders the colour
  // including its alpha component. The slot's `color` prop must reflect
  // whichever one is actually displayed.
  it("should expose the opaque colour string to the slot when alpha is false", () => {
    const wrapper = mount(ColorSwatchRoot, {
      props: { modelValue: "rgb(255 0 0 / 0.5)", alpha: false },
      slots: { default: "<template #default=\"{ color }\"><span>{{ color }}</span></template>" },
    });
    expect(wrapper.text()).toBe("rgb(255 0 0)");
  });

  it("should expose the alpha-inclusive colour string to the slot when alpha is true", () => {
    const wrapper = mount(ColorSwatchRoot, {
      props: { modelValue: "rgb(255 0 0 / 0.5)", alpha: true },
      slots: { default: "<template #default=\"{ color }\"><span>{{ color }}</span></template>" },
    });
    expect(wrapper.text()).toBe("rgb(255 0 0 / 0.5)");
  });
});

// ColorFieldSwatch wraps ColorSwatchRoot. It must keep working end-to-end
// after ColorSwatchRoot's template gains accessible-name attributes and
// scoped slot props.
describe("ColorFieldSwatch (consumer of ColorSwatchRoot)", () => {
  it("should still render the --swatch-color CSS variable", () => {
    const wrapper = mount(ColorFieldSwatch, { props: { modelValue: "hsl(180, 50%, 50%)" } });
    expect(wrapper.attributes("style")).toContain("--urcolor-swatch-color:");
  });

  it("should forward the accessible name and role from ColorSwatchRoot", () => {
    const wrapper = mount(ColorFieldSwatch, { props: { modelValue: "hsl(180, 50%, 50%)" } });
    expect(wrapper.attributes("role")).toBe("img");
    expect(wrapper.attributes("aria-label")).toBeTruthy();
    expect(wrapper.attributes("aria-roledescription")).toBe("color swatch");
  });
});
