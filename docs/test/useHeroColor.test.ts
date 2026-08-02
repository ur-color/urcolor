import { describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideHeroColor, useHeroColor } from "../.vitepress/composables/useHeroColor";

const Child = defineComponent({
  setup() {
    const color = useHeroColor();
    return () => h("span", { class: "hex" }, color.value.toString("hex"));
  },
});

const Parent = defineComponent({
  setup() {
    const color = provideHeroColor();
    return { color };
  },
  render() {
    return h("div", [h(Child)]);
  },
});

describe("useHeroColor", () => {
  it("defaults to the hero magenta", () => {
    const wrapper = mount(Parent);
    expect(wrapper.vm.color.to("hsv").get("h")).toBeCloseTo(328, 0);
  });

  it("shares one ref between provider and consumer", async () => {
    const wrapper = mount(Parent);
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".hex").text().toLowerCase()).toBe("#00ff00");
  });

  it("throws when used outside a provider", () => {
    expect(() => mount(Child)).toThrow(/provideHeroColor/);
  });
});
