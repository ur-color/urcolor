import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideHeroColor } from "../.vitepress/composables/useHeroColor";
import SatName from "../.vitepress/components/hero/SatName.vue";

// The panel defers its chunk load to idle. Running the callback synchronously
// is what a browser does on an empty main thread, and keeps the test off the
// component's 1.5s no-`requestIdleCallback` fallback timer.
beforeEach(() => {
  (window as unknown as Record<string, unknown>).requestIdleCallback = (cb: () => void) => cb();
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).requestIdleCallback;
});

const Harness = defineComponent({
  setup() {
    const color = provideHeroColor();
    return { color };
  },
  render() {
    return h("div", [h(SatName)]);
  },
});

describe("SatName", () => {
  it("labels the readout and names the language it answers in", () => {
    const wrapper = mount(Harness);
    expect(wrapper.find(".sat-name-label").text()).toBe("Name");
    // No vitepress client surface under `bun test`, so the lang falls back to
    // English — the endonym comes from `Intl`, not from a hand-kept table.
    expect(wrapper.find(".sat-name-lang").text()).toBe("English");
  });

  it("names the shared color once the language chunk loads", async () => {
    const wrapper = mount(Harness);
    await flushPromises();
    // Hue 328 at full saturation and value is the hero's opening magenta.
    expect(wrapper.find(".sat-name-value").text()).not.toBe("—");
    expect(wrapper.find(".sat-name-meta").text()).toContain("uwdata");
  });

  it("renames when the color changes", async () => {
    const wrapper = mount(Harness);
    await flushPromises();
    const before = wrapper.find(".sat-name-value").text();
    wrapper.vm.color = new Color("hsv", [120, 1, 0.6]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".sat-name-value").text()).not.toBe(before);
  });
});
