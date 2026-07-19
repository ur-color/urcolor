/** Which naming model backs a language, and how much of the space it covers. */
export interface LanguageCoverage {
  /** `"full"` = Oklab-cube model; `"hue"` = saturated-hue-circle model only. */
  model: "full" | "hue";
  /** Number of distinct colour terms modelled for this language. */
  terms: number;
  /** Fraction of the model's colour space that has data, 0–1. */
  coverage: number;
}

/** A namespaced colour-naming dataset. Sources are never merged. */
export interface NameSource {
  /** Stable identifier used in the `source` option, e.g. `"uwdata"`. */
  id: string;
  title: string;
  url: string;
  /** Upstream revision the shipped data was generated from. */
  commitSha?: string;
  /** SPDX identifier, or a plain-language note when the upstream has none. */
  license: string;
  /** Attribution text consumers should display. */
  citation: string;
  /** Caveats from the dataset authors that consumers should surface. */
  disclaimer?: string;
  languages: Record<string, LanguageCoverage>;
}

/** `[term, displayName, oklabCentroid]`. Centroid is null when unknown. */
export type TermEntry = [term: string, name: string, centroid: [number, number, number] | null];

/** Full-colour-space model: Oklab cubes keyed `"binL,binA,binB"`. */
export interface FullChunk {
  lang: string;
  model: "full";
  /** Oklab edge length of one bin. */
  binSize: number;
  terms: TermEntry[];
  /** Bin key -> `[termIndex, pTC]` pairs, sorted by pTC descending. */
  bins: Record<string, [termIndex: number, pTC: number][]>;
}

/** Hue-circle model: a fixed number of bins around the saturated hue ring. */
export interface HueChunk {
  lang: string;
  model: "hue";
  /** Number of bins around the circle. */
  binCount: number;
  terms: TermEntry[];
  /** Indexed by bin number; `[termIndex, pTC]` pairs sorted by pTC descending. */
  binTerms: [termIndex: number, pTC: number][][];
}

export type Chunk = FullChunk | HueChunk;

/** Locale -> lazy loader for that locale's chunk. */
export type ChunkLoaders = Record<string, () => Promise<{ default: Chunk }>>;
