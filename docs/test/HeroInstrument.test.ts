import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideHeroColor } from "../.vitepress/composables/useHeroColor";
import HeroInstrument from "../.vitepress/components/HeroInstrument.vue";

// The instrument itself no longer animates, but its children read the
// preference; stubbing it keeps gsap out of the test.
beforeEach(() => {
  (window as unknown as Record<string, unknown>).matchMedia = () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).matchMedia;
});

const Harness = defineComponent({
  setup() {
    const color = provideHeroColor();
    return { color };
  },
  render() {
    return h("div", [h(HeroInstrument)]);
  },
});

describe("HeroInstrument", () => {
  it("renders the hue ring", () => {
    const wrapper = mount(Harness);
    expect(wrapper.find("[aria-label='Hue']").exists()).toBe(true);
  });

  it("renders the triangle core", () => {
    expect(mount(Harness).find("[data-core-mode]").attributes("data-core-mode")).toBe("triangle");
  });

  it("never swaps the core for another component", async () => {
    const wrapper = mount(Harness);
    await new Promise(r => setTimeout(r, 50));
    expect(wrapper.find("[data-core-mode]").attributes("data-core-mode")).toBe("triangle");
    expect(wrapper.findAll("[data-core-mode]")).toHaveLength(1);
  });

  it("reflects the shared color on the ring", async () => {
    const wrapper = mount(Harness);
    wrapper.vm.color = new Color("hsv", [200, 1, 1]);
    await wrapper.vm.$nextTick();
    const ring = wrapper.find("[aria-label='Hue']");
    expect(Number(ring.attributes("aria-valuenow"))).toBeCloseTo(200, 0);
  });
});
