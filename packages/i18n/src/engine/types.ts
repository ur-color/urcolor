/** Which naming model backs a language, and how much of the space it covers. */
export interface LanguageCoverage {
  /**
   * `"full"` = Oklab-cube model; `"hue"` = saturated-hue-circle model only;
   * `"palette"` = a discrete catalogue of named colours with exact values,
   * not a model of a colour space at all.
   */
  model: "full" | "hue" | "palette";
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
  /**
   * When the shipped data was retrieved, for sources with no pinnable
   * revision (a live query endpoint rather than a git repo).
   */
  retrievedAt?: string;
  /** SPDX identifier, or a plain-language note when the upstream has none. */
  license: string;
  /** Attribution text consumers should display. */
  citation: string;
  /** Caveats from the dataset authors that consumers should surface. */
  disclaimer?: string;
  languages: Record<string, LanguageCoverage>;
}

/**
 * `[term, displayName, oklabCentroid, pCT]`. Centroid is `null` when
 * unknown. `pCT` is the maximum, across this term's bins, of upstream's
 * "probability the colour is named this term" signal — see
 * `scripts/sync-uwdata/transform.ts`'s `TermTable.indexOf` for why the
 * maximum is the representative choice. It is `null` when the source data
 * doesn't carry that signal for this model at all: full-model chunks always
 * have it, but a hue-model chunk's `null` here isn't a missing value for a
 * populated term, it's this asymmetry — upstream's hue-bin data may omit
 * `pCT` entirely (unlike the full model, where it's always present).
 */
export type TermEntry = [
  term: string,
  name: string,
  centroid: [number, number, number] | null,
  pCT: number | null,
];

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

/**
 * Discrete named colours, each with one exact sRGB value. Unlike the full and
 * hue models, this catalogues named points rather than modelling how speakers
 * name a space — so there are no bins and no sampled distribution.
 */
export interface PaletteChunk {
  lang: string;
  model: "palette";
  /**
   * One entry per (item, label in this language), ordered by the source's
   * salience ranking so that a first-match reverse lookup is deterministic.
   * `centroid` is always present in generated data — an item without a colour
   * value is filtered out at sync time. `pCT` is always `null`: this source
   * carries no "probability the colour is named this term" signal at all.
   */
  terms: TermEntry[];
  /** Parallel to `terms`: `[qid, hex]` provenance for each entry. */
  provenance: [qid: string, hex: string][];
  /** NFC-normalised, lowercased alias -> index into `terms`. Reverse lookup only. */
  aliases: Record<string, number>;
}

export type Chunk = FullChunk | HueChunk | PaletteChunk;

/** Locale -> lazy loader for that locale's chunk. */
export type ChunkLoaders = Record<string, () => Promise<{ default: Chunk }>>;
