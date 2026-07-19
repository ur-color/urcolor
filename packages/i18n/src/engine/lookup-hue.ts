import { Color } from "@urcolor/core";
import type { BinMatch, Candidate, LookupOptions } from "./lookup-full";
import type { HueChunk } from "./types";

export interface HueMatch extends BinMatch {
  /**
   * Oklab distance from the query to the fully saturated colour at the same
   * hue. The hue model only describes the saturated hue ring, so a large value
   * means the model has nothing meaningful to say about this colour.
   */
  hueProjectionDistance: number;
}

export interface HueLookupOptions extends LookupOptions {
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
