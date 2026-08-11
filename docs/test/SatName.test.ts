import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount, flushPromises } from "@vue/test-utils";
import { computed, defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideDocsLang } from "../.vitepress/composables/useDocsLang";
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

/**
 * `lang` is left unprovided by default so the panel falls through to
 * `useDocsLang`'s English, which is what the hero renders on the root locale.
 */
function harnessFor(lang?: string) {
  return defineComponent({
    setup() {
      if (lang !== undefined) provideDocsLang(computed(() => lang));
      const color = provideHeroColor();
      return { color };
    },
    render() {
      return h("div", [h(SatName)]);
    },
  });
}

const Harness = harnessFor();

/** Mount in `lang`, settle both chunk loads, then read the panel back. */
async function readout(lang: string, hex: string) {
  const wrapper = mount(harnessFor(lang));
  await flushPromises();
  wrapper.vm.color = Color.parse(hex)!;
  await wrapper.vm.$nextTick();
  return {
    name: wrapper.find(".sat-name-value").text(),
    meta: wrapper.find(".sat-name-meta").text(),
  };
}

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

  // White sits at the edge of uwdata's sampled space, where its nearest
  // populated bin is a real perceptual distance away and confidently wrong:
  // Chinese resolves it to 浅蓝色, "light blue". wikidata catalogues it exactly.
  it("answers from wikidata where uwdata's nearest bin is further away", async () => {
    const { name, meta } = await readout("zh", "#ffffff");
    expect(name).toBe("白色");
    expect(meta).toContain("wikidata");
  });

  // uwdata has no Russian data at all near white, so the old single-source
  // rule left the panel showing its no-data placeholder.
  it("names a color the language's first source has no data for", async () => {
    const { name, meta } = await readout("ru", "#ffffff");
    expect(name).toBe("белый");
    expect(meta).toContain("wikidata");
  });

  // Both sources answer this one and both are exact, so distance cannot
  // separate them. The tie goes to uwdata, and the two disagree on the answer:
  // it is a catalogued "olive" to wikidata and a spontaneous "green" to uwdata.
  it("gives an exact-against-exact tie to uwdata", async () => {
    const { name, meta } = await readout("en", "#808000");
    expect(name).toBe("green");
    expect(meta).toContain("uwdata");
  });

  // Not a tie: uwdata's bin is exact and wikidata's nearest catalogued colour
  // is 洋紅色, 0.08 away.
  it("keeps uwdata where its bin data covers the color", async () => {
    const { name, meta } = await readout("zh", "#ff00c8");
    expect(name).toBe("粉色");
    expect(meta).toContain("uwdata");
  });

  // uwdata never sampled Japanese, so this locale exercises the one-source path.
  it("answers from the only covering source when a language has one", async () => {
    const { name, meta } = await readout("ja", "#ff00c8");
    expect(name).not.toBe("—");
    expect(meta).toContain("wikidata");
  });
});
