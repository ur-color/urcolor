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
      map.set(row.simplifiedName, [row.avgFullL, row.avgFullA, row.avgFullB]);
    }
  }
  return map;
}

/** Interns terms into a shared table so bins can reference them by index. */
class TermTable {
  readonly entries: TermEntry[] = [];
  readonly #indices = new Map<string, number>();

  constructor(private readonly centroids: Map<string, [number, number, number]>) {}

  indexOf(term: string, name: string): number {
    const existing = this.#indices.get(term);
    if (existing !== undefined) return existing;

    // When the same term recurs with a different display name (commonTerm),
    // the first-seen display name wins; subsequent recurrences are ignored.
    const index = this.entries.length;
    this.entries.push([term, name, this.centroids.get(term) ?? null]);
    this.#indices.set(term, index);
    return index;
  }
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
    const index = table.indexOf(record.term, record.commonTerm);
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
    const index = table.indexOf(term, value.commonName);
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

export function chunkCoverage(chunk: FullChunk | HueChunk): LanguageCoverage {
  if (chunk.model === "hue") {
    const populated = chunk.binTerms.filter(candidates => candidates.length > 0).length;
    return { model: "hue", terms: chunk.terms.length, coverage: populated / chunk.binCount };
  }

  // For the full model there is no single "total bin count" — the Oklab cube is
  // not fully realisable in sRGB. Report populated bins against the number of
  // bins that would tile the sRGB-reachable portion of Oklab, approximated as
  // L in [0,1], a and b in [-0.4, 0.4].
  const perAxis = Math.round(0.8 / chunk.binSize);
  const total = Math.round(1 / chunk.binSize) * perAxis * perAxis;
  return {
    model: "full",
    terms: chunk.terms.length,
    coverage: Object.keys(chunk.bins).length / total,
  };
}
