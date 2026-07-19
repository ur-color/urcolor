import { Color } from "@urcolor/core";
import type { FullChunk, HueChunk, LanguageCoverage, TermEntry } from "../../src/engine/types";
import type { RawBasicRow, RawFullRecord, RawHueTerm } from "./fetch";

/** Oklab edge length of one bin in `full_color_names_binned_0.05.json`. */
export const FULL_BIN_SIZE = 0.05;

/** Bin count in `hue_color_names_binned_72.json`. */
export const HUE_BIN_COUNT = 72;

function centroidIndex(centroids: RawBasicRow[]): Map<string, [number, number, number]> {
  const map = new Map<string, [number, number, number]>();
  for (const row of centroids) {
    if (Number.isFinite(row.avgFullL) && Number.isFinite(row.avgFullA) && Number.isFinite(row.avgFullB)) {
      // Upstream ships some terms in NFD; normalise so lookups from
      // TermTable.indexOf (which normalises to NFC before matching) hit.
      map.set(row.simplifiedName.normalize("NFC"), [row.avgFullL, row.avgFullA, row.avgFullB]);
    }
  }
  return map;
}

/**
 * Interns terms into a shared table so bins can reference them by index.
 *
 * Upstream ships some colour terms in Unicode NFD (decomposed) form while
 * everything a consumer types, pastes, or writes as a source literal is NFC
 * (composed) — the two render identically but compare unequal with `===`.
 * Both `term` and `name` are normalised to NFC before interning, so shipped
 * data is always NFC and two upstream spellings differing only by
 * normalisation form collapse to a single entry instead of two.
 */
class TermTable {
  readonly entries: TermEntry[] = [];
  readonly #indices = new Map<string, number>();

  constructor(private readonly centroids: Map<string, [number, number, number]>) {}

  /**
   * `pCT` ("how strongly this term identifies its own colour") is per-bin
   * upstream, but a term table entry is per-term. The maximum across a
   * term's bins is the natural representative value: it's the bin where the
   * term is the *most* distinctive identifier of its colour, which is a more
   * useful single number for a caller than e.g. an average diluted by bins
   * where the term is a weak, secondary label. `null` means no bin carried a
   * usable pCT for this term (see {@link RawHueTerm}).
   */
  indexOf(term: string, name: string, pCT: number | null): number {
    const normalizedTerm = term.normalize("NFC");
    const normalizedName = name.normalize("NFC");

    const existing = this.#indices.get(normalizedTerm);
    if (existing !== undefined) {
      if (pCT !== null) {
        const entry = this.entries[existing]!;
        if (entry[3] === null || pCT > entry[3]) entry[3] = pCT;
      }
      return existing;
    }

    // When the same term recurs with a different display name (commonTerm),
    // the first-seen display name wins; subsequent recurrences are ignored.
    const index = this.entries.length;
    this.entries.push([normalizedTerm, normalizedName, this.centroids.get(normalizedTerm) ?? null, pCT]);
    this.#indices.set(normalizedTerm, index);
    return index;
  }
}

/** Maximum of the finite values in `values`, or `null` if none are finite. */
function maxFinite(values: number[]): number | null {
  let max: number | null = null;
  for (const value of values) {
    if (Number.isFinite(value) && (max === null || value > max)) max = value;
  }
  return max;
}

export function buildFullChunk(
  lang: string,
  records: RawFullRecord[],
  centroids: RawBasicRow[],
): FullChunk {
  const table = new TermTable(centroidIndex(centroids));
  const bins: Record<string, [number, number][]> = {};

  for (const record of records) {
    const key = `${record.binL},${record.binA},${record.binB}`;
    const index = table.indexOf(record.term, record.commonTerm, record.pCT);
    (bins[key] ??= []).push([index, record.pTC]);
  }

  for (const candidates of Object.values(bins)) {
    candidates.sort((a, b) => b[1] - a[1]);
  }

  return { lang, model: "full", binSize: FULL_BIN_SIZE, terms: table.entries, bins };
}

export function buildHueChunk(
  lang: string,
  terms: Record<string, RawHueTerm>,
  centroids: RawBasicRow[],
): HueChunk {
  const table = new TermTable(centroidIndex(centroids));
  const binTerms: [number, number][][] = Array.from({ length: HUE_BIN_COUNT }, () => []);

  for (const [term, value] of Object.entries(terms)) {
    const pCT = maxFinite(value.bins.map(bin => bin.pCT));
    const index = table.indexOf(term, value.commonName, pCT);
    value.bins.forEach((bin, binIndex) => {
      if (binIndex >= HUE_BIN_COUNT || !(bin.pTC > 0)) return;
      binTerms[binIndex]?.push([index, bin.pTC]);
    });
  }

  for (const candidates of binTerms) {
    candidates.sort((a, b) => b[1] - a[1]);
  }

  return { lang, model: "hue", binCount: HUE_BIN_COUNT, terms: table.entries, binTerms };
}

/** Per-axis sample count used to walk the sRGB cube when measuring reachable Oklab bins. */
const REACHABLE_GRID_RESOLUTION = 40;

/** `binSize` -> number of distinct Oklab bins touched by the sRGB gamut, memoised. */
const reachableBinCountCache = new Map<number, number>();

/**
 * Counts the distinct Oklab bins (edge length `binSize`) that a dense sRGB
 * grid actually lands in. The Oklab cube (L in [0,1], a and b in [-0.4, 0.4])
 * is mostly unreachable from sRGB — walking the gamut directly gives the true
 * denominator instead of the volume of a bounding box that contains it.
 */
function reachableBinCount(binSize: number): number {
  const cached = reachableBinCountCache.get(binSize);
  if (cached !== undefined) return cached;

  const n = REACHABLE_GRID_RESOLUTION;
  const bins = new Set<string>();
  for (let ri = 0; ri < n; ri++) {
    for (let gi = 0; gi < n; gi++) {
      for (let bi = 0; bi < n; bi++) {
        const r = (ri / (n - 1)) * 255;
        const g = (gi / (n - 1)) * 255;
        const b = (bi / (n - 1)) * 255;
        const [l, a, bLab] = Color.fromRgb(r, g, b).to("oklab").coords;
        bins.add(`${Math.round(l / binSize)},${Math.round(a / binSize)},${Math.round(bLab / binSize)}`);
      }
    }
  }

  const count = bins.size;
  reachableBinCountCache.set(binSize, count);
  return count;
}

export function chunkCoverage(chunk: FullChunk | HueChunk): LanguageCoverage {
  if (chunk.model === "hue") {
    const populated = chunk.binTerms.filter(candidates => candidates.length > 0).length;
    return { model: "hue", terms: chunk.terms.length, coverage: populated / chunk.binCount };
  }

  // For the full model there is no single "total bin count" the way there is for
  // hue — the Oklab cube is not fully realisable in sRGB. The denominator is the
  // number of Oklab bins the sRGB gamut actually touches, found by densely
  // sampling the sRGB cube and quantising each sample into an Oklab bin
  // (memoised per `binSize`, since it doesn't depend on the chunk's data).
  // Upstream can include wide-gamut (p3/rec2020) samples outside sRGB, so the
  // ratio is clamped to 1.
  const total = reachableBinCount(chunk.binSize);
  return {
    model: "full",
    terms: chunk.terms.length,
    coverage: Math.min(1, Object.keys(chunk.bins).length / total),
  };
}
