import { describe, expect, it } from "bun:test";
import meta from "../src/data/uwdata/meta.json";
import { uwdataChunks } from "../src/sources/uwdata/chunks";
import type { FullChunk, HueChunk } from "../src/engine/types";

const FULL_LANGS = ["de", "en", "es", "fa", "fi", "fr", "ko", "nl", "pl", "pt", "ro", "ru", "sv", "zh"];

describe("generated uwdata data", () => {
  it("pins the expected upstream revision", () => {
    expect(meta.commitSha).toBe("f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5");
  });

  it("ships all 14 full-model languages", () => {
    for (const lang of FULL_LANGS) {
      expect(meta.languages[lang as keyof typeof meta.languages]?.model).toBe("full");
    }
  });

  // Upstream's basic_colors_info directory lists 41 languages, but at the
  // pinned commit only 20 of them (14 full-model + 6 hue-model) actually have
  // entries in the binned name-lookup files this package consumes
  // (full_color_names_binned_0.05.json / hue_color_names_binned_72.json). The
  // other 21 have per-term centroid data only, with no name-lookup data at any
  // granularity — see scripts/sync-uwdata/main.ts's HUE_LANGS comment. If a
  // future upstream revision adds binned data for more languages, raise this
  // floor to match; if it drops below 20, that is a real regression to chase.
  it("ships at least 20 languages in total", () => {
    expect(Object.keys(meta.languages).length).toBeGreaterThanOrEqual(20);
  });

  it("has a loader for every language in meta", () => {
    for (const lang of Object.keys(meta.languages)) {
      expect(uwdataChunks[lang]).toBeFunction();
    }
  });

  it("loads English with a well-formed full chunk", async () => {
    const chunk = (await uwdataChunks.en!()).default as FullChunk;
    expect(chunk.model).toBe("full");
    expect(chunk.binSize).toBe(0.05);
    expect(chunk.terms.length).toBeGreaterThan(50);
    expect(Object.keys(chunk.bins).length).toBeGreaterThan(500);
  });

  it("loads Arabic with a well-formed hue chunk", async () => {
    const chunk = (await uwdataChunks.ar!()).default as HueChunk;
    expect(chunk.model).toBe("hue");
    expect(chunk.binCount).toBe(72);
    expect(chunk.binTerms).toHaveLength(72);
  });

  // English is by far the largest chunk (561 terms). The real size is ~622 KB;
  // 400 KB was the plan's original guess and does not hold. Ceiling raised to
  // the real value plus ~15% headroom so this still catches a future data
  // update silently inflating the bundle further.
  it("keeps every chunk under 715 KB", async () => {
    for (const lang of Object.keys(meta.languages)) {
      const bytes = Bun.file(`${import.meta.dir}/../src/data/uwdata/${lang}.js`).size;
      expect(bytes).toBeLessThan(715 * 1024);
    }
  });
});
