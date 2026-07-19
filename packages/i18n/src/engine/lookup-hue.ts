import { Color } from "@urcolor/core";
import type { BinMatch, Candidate } from "./lookup-full";
import type { HueChunk } from "./types";

/**
 * The hue model's per-lookup result. `coverage` here is always `"exact"` or
 * `"none"` — unlike the full model, a hue-bin miss has no neighbouring bin to
 * fall back to (there is no "nearest hue bin" search), so this never reports
 * `"nearest"`. Consequently `fallback: "none"` (see `ColorNamesOptions`) has
 * nothing to filter for hue-model locales — it's a no-op there.
 */
export interface HueMatch extends BinMatch {
  /**
   * Oklab distance from the query to the fully saturated colour at the same
   * hue. The hue model only describes the saturated hue ring, so a large value
   * means the model has nothing meaningful to say about this colour.
   */
  hueProjectionDistance: number;
}

/**
 * Unlike {@link LookupOptions}, there is deliberately no `maxDistance` here:
 * the hue model can only ever land in a populated bin (`"exact"`) or miss
 * entirely (`"none"`, gated by `maxHueDistance`), so a bin-search radius has
 * nothing to do. See {@link HueMatch}.
 */
export interface HueLookupOptions {
  topN: number;
  /** Beyond this Oklab distance from the hue ring, report no coverage. */
  maxHueDistance: number;
}

function oklabOf(color: Color): [number, number, number] {
  const [l, a, b] = color.to("oklab").coords;
  return [l, a, b];
}

export function lookupHue(chunk: HueChunk, color: Color, options: HueLookupOptions): HueMatch {
  const hsl = color.to("hsl");
  const hue = ((hsl.coords[0] % 360) + 360) % 360;

  // The saturated reference colour at this hue — what the hue model
  // describes. `fromHsl`'s s/l are fractions (0..1), not percentages.
  const reference = Color.fromHsl(hue, 1, 0.5);
  const [ql, qa, qb] = oklabOf(color);
  const [rl, ra, rb] = oklabOf(reference);
  const hueProjectionDistance = Math.hypot(ql - rl, qa - ra, qb - rb);

  const none: HueMatch = {
    candidates: [],
    coverage: "none",
    binDistance: Number.POSITIVE_INFINITY,
    hueProjectionDistance,
  };

  if (hueProjectionDistance > options.maxHueDistance) return none;

  const bin = Math.floor((hue / 360) * chunk.binCount) % chunk.binCount;
  const pairs = chunk.binTerms[bin];
  if (pairs === undefined || pairs.length === 0) return none;

  const candidates: Candidate[] = pairs.slice(0, options.topN).flatMap(([termIndex, probability]) => {
    const entry = chunk.terms[termIndex];
    return entry === undefined ? [] : [{ term: entry[0], name: entry[1], probability }];
  });

  return { candidates, coverage: "exact", binDistance: 0, hueProjectionDistance };
}
