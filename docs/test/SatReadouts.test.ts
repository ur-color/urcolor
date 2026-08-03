import { describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideHeroColor } from "../.vitepress/composables/useHeroColor";
import SatFormats from "../.vitepress/components/hero/SatFormats.vue";
import SatHex from "../.vitepress/components/hero/SatHex.vue";
import SatSwatches from "../.vitepress/components/hero/SatSwatches.vue";

function harness(Inner: unknown, props: Record<string, unknown> = {}) {
  return defineComponent({
    setup() {
      const color = provideHeroColor();
      return { color };
    },
    render() {
      return h("div", [h(Inner as never, props)]);
    },
  });
}

describe("SatHex", () => {
  it("renders a single hex input", () => {
    const wrapper = mount(harness(SatHex));
    expect(wrapper.findAll("input")).toHaveLength(1);
  });

  it("captions the input", () => {
    expect(mount(harness(SatHex)).find(".sat-hex-label").text()).toBe("Hex");
  });

  it("omits the format lines by default", () => {
    expect(mount(harness(SatHex)).findAll(".sat-format-line")).toHaveLength(0);
  });

  it("folds the format lines in when asked, for compact mode", () => {
    const wrapper = mount(harness(SatHex, { withFormats: true }));
    expect(wrapper.findAll(".sat-format-line").length).toBeGreaterThan(0);
  });
});

describe("SatFormats", () => {
  it("renders one line per format", () => {
    expect(mount(harness(SatFormats)).findAll(".sat-format-line")).toHaveLength(4);
  });

  it("serialises the shared color", () => {
    const text = mount(harness(SatFormats)).text();
    expect(text).toContain("oklch(");
    expect(text).toContain("lch(");
    expect(text).toContain("hsl(");
    expect(text).toContain("display-p3");
  });

  it("restates the color when it changes", async () => {
    const wrapper = mount(harness(SatFormats));
    const before = wrapper.text();
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toBe(before);
  });
});

describe("SatSwatches", () => {
  it("renders eight ramp swatches", () => {
    expect(mount(harness(SatSwatches)).findAll("[data-swatch-index]")).toHaveLength(8);
  });

  it("rebuilds the ramp at the current hue", async () => {
    const wrapper = mount(harness(SatSwatches));
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    expect(wrapper.html()).toContain("hsl(120, 85%");
  });

  it("shows the picked color in a wide swatch above the ramp, outside the picker", async () => {
    const wrapper = mount(harness(SatSwatches));
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    const current = wrapper.find(".sat-swatch-current");
    expect(current.attributes("data-swatch-index")).toBeUndefined();
    expect(current.attributes("style")).toContain("--swatch-color: rgb(0 255 0)");
  });
});
