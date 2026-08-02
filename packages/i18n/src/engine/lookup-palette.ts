import type { BinMatch, Candidate, LookupOptions } from "./lookup-full";
import type { PaletteChunk } from "./types";

/**
 * Oklab distance below which a query counts as *being* a catalogued colour
 * rather than merely near one. Well under any perceptible difference, so it
 * only ever fires for a genuine round-trip of the source's own hex value.
 */
export const EXACT_EPSILON = 1e-6;

const EMPTY: BinMatch = { candidates: [], coverage: "none", binDistance: Number.POSITIVE_INFINITY };

/**
 * Proximity confidence in [0, 1] — **not** a naming frequency. The palette
 * model has no sampled distribution to report, so rather than fabricate one,
 * this reports how close the match is relative to the search radius. Callers
 * who need the underlying truth read `binDistance`, which is always exact.
 *
 * With `maxDistance <= 0` only an exact hit can match at all, so the ratio is
 * undefined and irrelevant; such a match reports full confidence.
 */
function proximity(distance: number, maxDistance: number): number {
  if (!(maxDistance > 0)) return 1;
  return Math.min(1, Math.max(0, 1 - distance / maxDistance));
}

/**
 * Nearest-centroid search over every entry in the chunk.
 *
 * Brute force is the right choice here, not a concession: the largest shipped
 * chunk holds 897 entries, so a full scan is a few microseconds — cheaper than
 * building and traversing a spatial index, and immune to the correctness traps
 * that come with one.
 */
export function lookupPalette(
  chunk: PaletteChunk,
  oklab: [number, number, number],
  options: LookupOptions,
): BinMatch {
  const [l, a, b] = oklab;

  const scored: { candidate: Candidate; distance: number }[] = [];
  for (const entry of chunk.terms) {
    const centroid = entry[2];
    if (centroid === null) continue;
    const distance = Math.hypot(centroid[0] - l, centroid[1] - a, centroid[2] - b);
    scored.push({ candidate: { term: entry[0], name: entry[1], probability: 0 }, distance });
  }

  if (scored.length === 0) return EMPTY;
  scored.sort((x, y) => x.distance - y.distance);

  const nearest = scored[0]!;
  const exact = nearest.distance <= EXACT_EPSILON;
  if (!exact && !(nearest.distance <= options.maxDistance)) return EMPTY;

  const candidates = scored.slice(0, options.topN).map(({ candidate, distance }) => ({
    ...candidate,
    probability: proximity(distance, options.maxDistance),
  }));

  return {
    candidates,
    coverage: exact ? "exact" : "nearest",
    binDistance: nearest.distance,
  };
}
