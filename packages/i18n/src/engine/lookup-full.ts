import type { FullChunk } from "./types";

/** Determined empirically in scripts/calibrate-bins.ts against upstream data. */
const QUANTIZE_MODE: "round" | "floor" = "round";

export interface Candidate {
  name: string;
  term: string;
  /**
   * Meaning depends on the model that produced this candidate. For `full`
   * and `hue` chunks this is a sampled naming frequency: the fraction of
   * upstream study participants who used this term for a colour in the
   * matched bin. For `palette` chunks (see `lookupPalette`) there is no
   * sampled distribution to draw from — this is instead a proximity
   * confidence derived from Oklab distance to the candidate's catalogued
   * colour, and it is NOT a naming frequency. Either way, the underlying
   * raw distance is always available on `BinMatch.binDistance` /
   * `ColorNameResolution.binDistance`.
   */
  probability: number;
}

export interface BinMatch {
  candidates: Candidate[];
  coverage: "exact" | "nearest" | "none";
  /** Oklab distance from the query to the centre of the bin actually used. */
  binDistance: number;
}

export interface LookupOptions {
  topN: number;
  maxDistance: number;
}

function quantize(value: number, size: number): number {
  return QUANTIZE_MODE === "round" ? Math.round(value / size) : Math.floor(value / size);
}

function binCentre(index: number, size: number): number {
  return QUANTIZE_MODE === "round" ? index * size : (index + 0.5) * size;
}

const EMPTY: BinMatch = { candidates: [], coverage: "none", binDistance: Number.POSITIVE_INFINITY };

function toCandidates(chunk: FullChunk, pairs: [number, number][], topN: number): Candidate[] {
  return pairs.slice(0, topN).flatMap(([termIndex, probability]) => {
    const entry = chunk.terms[termIndex];
    return entry === undefined ? [] : [{ term: entry[0], name: entry[1], probability }];
  });
}

export function lookupFull(
  chunk: FullChunk,
  oklab: [number, number, number],
  options: LookupOptions,
): BinMatch {
  const [l, a, b] = oklab;
  const size = chunk.binSize;
  const origin: [number, number, number] = [
    quantize(l, size),
    quantize(a, size),
    quantize(b, size),
  ];

  const exact = chunk.bins[origin.join(",")];
  if (exact !== undefined) {
    return { candidates: toCandidates(chunk, exact, options.topN), coverage: "exact", binDistance: 0 };
  }

  if (!(options.maxDistance > 0)) return EMPTY;

  const radius = Math.ceil(options.maxDistance / size);
  let best: { pairs: [number, number][]; distance: number } | undefined;

  for (let dl = -radius; dl <= radius; dl++) {
    for (let da = -radius; da <= radius; da++) {
      for (let db = -radius; db <= radius; db++) {
        if (dl === 0 && da === 0 && db === 0) continue;

        const key = `${origin[0] + dl},${origin[1] + da},${origin[2] + db}`;
        const pairs = chunk.bins[key];
        if (pairs === undefined) continue;

        const distance = Math.hypot(
          binCentre(origin[0] + dl, size) - l,
          binCentre(origin[1] + da, size) - a,
          binCentre(origin[2] + db, size) - b,
        );
        if (distance > options.maxDistance) continue;
        if (best === undefined || distance < best.distance) best = { pairs, distance };
      }
    }
  }

  if (best === undefined) return EMPTY;
  return {
    candidates: toCandidates(chunk, best.pairs, options.topN),
    coverage: "nearest",
    binDistance: best.distance,
  };
}
