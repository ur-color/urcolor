import meta from "../src/data/uwdata/meta.json";
import type { FullChunk } from "../src/engine/types";

const MODES = ["floor", "round"] as const;
type Mode = (typeof MODES)[number];

function quantize(value: number, size: number, mode: Mode): number {
  return mode === "floor" ? Math.floor(value / size) : Math.round(value / size);
}

const results: Record<Mode, { hit: number; total: number }> = {
  floor: { hit: 0, total: 0 },
  round: { hit: 0, total: 0 },
};

for (const [lang, coverage] of Object.entries(meta.languages)) {
  if (coverage.model !== "full") continue;
  const chunk = (await import(`../src/data/uwdata/${lang}.js`)).default as FullChunk;

  chunk.terms.forEach(([, , centroid], termIndex) => {
    if (centroid === null) return;
    const [l, a, b] = centroid;

    for (const mode of MODES) {
      const key = [
        quantize(l, chunk.binSize, mode),
        quantize(a, chunk.binSize, mode),
        quantize(b, chunk.binSize, mode),
      ].join(",");
      results[mode].total++;
      if (chunk.bins[key]?.some(([index]) => index === termIndex) === true) {
        results[mode].hit++;
      }
    }
  });
}

for (const mode of MODES) {
  const { hit, total } = results[mode];
  console.log(`${mode}: ${hit}/${total} = ${((hit / total) * 100).toFixed(1)}%`);
}
