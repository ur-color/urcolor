import { Color } from "@urcolor/core";
import { filterSupportedLocales } from "./engine/locale";
import { getLoadedChunk, getSource, loadChunk } from "./engine/registry";
import { chainLocales, normalizeChain, resolveSourceChain } from "./engine/source-chain";
import { lookupFull, type BinMatch, type Candidate } from "./engine/lookup-full";
import { lookupHue, type HueMatch } from "./engine/lookup-hue";
import { lookupPalette } from "./engine/lookup-palette";
import type { Chunk } from "./engine/types";

export interface ColorNamesOptions {
  /**
   * Which dataset(s) answer, in priority order.
   *
   * Omit it for the package default chain. A single id pins the instance to
   * that source and throws when it has no data for the locale — unchanged
   * from before this option became optional. An array walks the sources in
   * order.
   *
   * Sources are never merged: exactly one answers an entire instance, chosen
   * at load time and fixed thereafter, so two colours resolved from the same
   * instance always come from the same dataset. `resolvedOptions().source`
   * and `resolve().source` always name the one that answered.
   */
  source?: string | readonly string[];
  /** `"long"` gives the display name, `"short"` the matching key. */
  style?: "long" | "short";
  /**
   * `"none"` makes `of()` return undefined unless `resolve()` would report
   * `coverage: "exact"`. Effect differs by model:
   * - `"full"`: filters out neighbouring-bin guesses, which are common near
   *   the achromatic extremes (very light/dark/grey) where sample data is
   *   thin. See the achromatic-extremes note on {@link resolve}.
   * - `"hue"`: a no-op. The hue model's lookup never reports `"nearest"`
   *   coverage (see {@link HueMatch}) — a query either lands in a populated
   *   bin or gets `"none"` — so there is nothing for `fallback: "none"` to
   *   filter for the 6 hue-model locales (`ar da el hu it tr`).
   * - `"palette"`: highly consequential, not a no-op. Palette lookups report
   *   `"nearest"` for essentially every query — anything more than
   *   `EXACT_EPSILON` (1e-6) from a catalogued hex — since the model has no
   *   notion of exact bins to begin with, so `fallback: "none"` suppresses
   *   almost all answers for the 298 wikidata locales.
   */
  fallback?: "nearest" | "none";
  /**
   * Oklab search radius used at lookup time, unconditionally — see
   * {@link resolve}, which documents that `resolve()` always looks up with
   * the full radius regardless of `fallback`. Defaults to
   * {@link DEFAULT_MAX_DISTANCE} for `full`/`hue` locales and the wider
   * {@link DEFAULT_PALETTE_MAX_DISTANCE} for `palette` locales, since a few
   * hundred catalogued colours spread across Oklab leave real gaps that a
   * bin-grid-tuned radius would miss.
   */
  maxDistance?: number;
  /** How many candidates `resolve()` returns. */
  topN?: number;
}

export interface ColorNameResolution {
  name: string | undefined;
  term: string | undefined;
  /**
   * Meaning is model-dependent — see {@link Candidate.probability} for the
   * full explanation. For `"full"` and `"hue"` locales this is a sampled
   * naming frequency from the source data. For `"palette"` locales (the
   * entire wikidata source) there is no sampled distribution, so this is a
   * proximity confidence derived from Oklab distance to the nearest
   * catalogued colour, NOT a frequency. `binDistance` below always carries
   * the raw distance regardless of model, so it's the honest number to read
   * when this distinction matters.
   */
  probability: number;
  candidates: Candidate[];
  model: "full" | "hue" | "palette";
  source: string;
  coverage: "exact" | "nearest" | "none";
  binDistance: number;
  /**
   * Oklab distance from the query to the fully saturated colour at the same
   * hue. Present only when `model` is `"hue"` — the full model has no notion
   * of "the hue ring", so this is `undefined` there. See {@link HueMatch}.
   */
  hueProjectionDistance?: number;
}

export interface ResolvedColorNamesOptions {
  locale: string;
  source: string;
  /** The chain that was considered, in priority order. */
  sources: string[];
  model: "full" | "hue" | "palette";
  style: "long" | "short";
  fallback: "nearest" | "none";
  binSize: number | undefined;
  coverage: number;
}

const DEFAULT_MAX_DISTANCE = 0.075;
const DEFAULT_TOP_N = 5;

/**
 * The palette model's default search radius is wider than the binned models'.
 * A few hundred catalogued colours spread across Oklab leave real gaps — a
 * radius tuned for a dense 0.05 bin grid would report "none" for ordinary
 * colours.
 */
const DEFAULT_PALETTE_MAX_DISTANCE = 0.15;

/**
 * The hue model only describes the saturated hue ring; beyond this Oklab
 * distance from it, the model has nothing meaningful to say.
 */
const MAX_HUE_DISTANCE = 0.2;

/** Extract a colour's Oklab coordinates as a plain tuple. */
function oklabOf(color: Color): [number, number, number] {
  const [l, a, b] = color.to("oklab").coords;
  return [l, a, b];
}

/** `undefined` for a full-model match; the hue model always sets this field. */
function hueProjectionDistanceOf(match: BinMatch | HueMatch): number | undefined {
  return "hueProjectionDistance" in match ? match.hueProjectionDistance : undefined;
}

/**
 * Multilingual colour naming, shaped after `Intl.DisplayNames`.
 *
 * ```ts
 * const names = await ColorNames.load("ko", { source: "uwdata" });
 * names.of(Color.parse("#3b82f6")!); // "파랑색"
 * ```
 *
 * Upstream is internally inconsistent about this term's spelling:
 * `basic_colors_info_ko.csv` (the standard Korean spelling) says `파란색`,
 * while the binned file's `commonTerm` says `파랑색`. `TermTable`'s
 * first-seen-wins interning policy (see `scripts/sync-uwdata/transform.ts`)
 * reads the binned file first, so `파랑색` is what ships. Defensible, but
 * worth knowing.
 */
export class ColorNames {
  readonly #locale: string;
  readonly #options: Required<Omit<ColorNamesOptions, "source">> & { source: string };
  readonly #sources: string[];
  readonly #chunk: Chunk;

  constructor(locales: string | readonly string[], options: ColorNamesOptions = {}) {
    const sources = normalizeChain(options.source);
    const match = resolveSourceChain(locales, sources);
    if (match === undefined) {
      throw new RangeError(
        `No source has data for the requested locale(s). Tried: ${sources.join(", ")}. `
        + "Use ColorNames.supportedLocalesOf() to check first.",
      );
    }

    const chunk = getLoadedChunk(match.source, match.locale);
    if (chunk === undefined) {
      // Name the resolved chain, not just the winning source or the
      // caller's raw (possibly omitted) `options.source` — retrying with
      // either of those can silently load the wrong source's chunk and
      // throw this identical error again, forever. `sources` here is
      // already the fully-normalized chain this constructor resolved
      // against, so it's the one command that actually fixes this.
      throw new Error(
        `Colour data for "${match.locale}" from source "${match.source}" is not loaded. `
        + `Call await ColorNames.load(${JSON.stringify(locales)}, `
        + `{ source: ${JSON.stringify(sources)} }) first.`,
      );
    }

    this.#locale = match.locale;
    this.#sources = sources;
    this.#chunk = chunk;
    this.#options = {
      source: match.source,
      style: options.style ?? "long",
      fallback: options.fallback ?? "nearest",
      maxDistance: options.maxDistance
        ?? (chunk.model === "palette" ? DEFAULT_PALETTE_MAX_DISTANCE : DEFAULT_MAX_DISTANCE),
      topN: options.topN ?? DEFAULT_TOP_N,
    };
  }

  /**
   * Resolve the source and locale, load the chunk, and construct an instance.
   *
   * `options` is snapshotted before the `await loadChunk(...)` below, and the
   * constructor is handed the already-resolved `sources` chain rather than
   * re-reading `options.source` itself. Without this, a caller that mutates
   * their `options` object during the await window (or reuses/shares it)
   * could make the constructor re-resolve against a different chain than the
   * one `load` actually loaded a chunk for — silently answering from a
   * dataset this call never loaded, or throwing the generic "not loaded"
   * error. Passing the full `sources` array (not just the winning
   * `match.source`) is deliberate: it's what keeps `resolvedOptions().sources`
   * reporting the whole chain that was considered, not just the winner.
   */
  static async load(
    locales: string | readonly string[],
    options: ColorNamesOptions = {},
  ): Promise<ColorNames> {
    const snapshot = { ...options };
    const sources = normalizeChain(snapshot.source);
    const match = resolveSourceChain(locales, sources);
    if (match === undefined) {
      throw new RangeError(
        `No source has data for the requested locale(s). Tried: ${sources.join(", ")}.`,
      );
    }
    await loadChunk(match.source, match.locale);
    return new ColorNames(locales, { ...snapshot, source: sources });
  }

  static supportedLocalesOf(
    locales: string | readonly string[],
    options: { source?: string | readonly string[] } = {},
  ): string[] {
    const chain = normalizeChain(options.source);
    // A language-neutral source answers any tag at all, so every requested tag
    // is supported once one is in the chain. Filtering against `chainLocales`
    // would compare ordinary tags against "und" and report none supported.
    if (chain.some(id => getSource(id).languageNeutral === true)) {
      return typeof locales === "string" ? [locales] : [...locales];
    }
    return filterSupportedLocales(locales, chainLocales(chain));
  }

  /**
   * The colour's name in this locale, or `undefined` when unavailable.
   *
   * With the default `fallback: "nearest"`, colours near the achromatic
   * extremes (very light, very dark, near-grey) can return a wrong but
   * confident-looking name: those regions sit at the edge of the sampled
   * space, where the nearest populated bin can be a real perceptual
   * distance away. Pure white, for instance, resolves to "light pink" in
   * Korean and "light blue" in Chinese. Check `coverage` and `binDistance`
   * on {@link resolve} to detect this, or pass `fallback: "none"` to opt
   * out of nearest-bin guesses entirely.
   */
  of(color: Color): string | undefined {
    const result = this.resolve(color);
    if (result.coverage === "none") return undefined;
    if (result.coverage === "nearest" && this.#options.fallback === "none") return undefined;
    return this.#options.style === "short" ? result.term : result.name;
  }

  /**
   * The full result, including candidates, probabilities, and coverage.
   *
   * Always looks up with the full `maxDistance` — `fallback` is not a
   * lookup-time filter, it only decides what {@link of} does with a
   * `"nearest"` result. `resolve()` itself reports the true `coverage` and
   * `binDistance` regardless of `fallback`, so a caller who wants to know
   * whether a *would-be* answer exists nearby can always find out here, even
   * when `of()` is configured to withhold it.
   */
  resolve(color: Color): ColorNameResolution {
    const { source, topN, maxDistance } = this.#options;

    let match: BinMatch | HueMatch;
    switch (this.#chunk.model) {
      case "full":
        match = lookupFull(this.#chunk, oklabOf(color), { topN, maxDistance });
        break;
      case "hue":
        match = lookupHue(this.#chunk, color, { topN, maxHueDistance: MAX_HUE_DISTANCE });
        break;
      case "palette":
        match = lookupPalette(this.#chunk, oklabOf(color), { topN, maxDistance });
        break;
    }

    const best = match.candidates[0];
    return {
      name: best?.name,
      term: best?.term,
      probability: best?.probability ?? 0,
      candidates: match.candidates,
      model: this.#chunk.model,
      source,
      coverage: match.coverage,
      binDistance: match.binDistance,
      hueProjectionDistance: hueProjectionDistanceOf(match),
    };
  }

  /** The representative colour for a term, or `undefined` if unknown. */
  colorOf(term: string): Color | undefined {
    return this.resolveColorOf(term)?.color;
  }

  resolveColorOf(
    term: string,
  ): { color: Color; term: string; name: string; pCT: number | null } | undefined {
    // Shipped data is normalised to NFC (composed) at generation time, but a
    // caller may pass NFD (decomposed) — macOS filesystem APIs and some IMEs
    // produce it — which renders identically but fails `===`. Normalise the
    // input, not the comparison strategy: this keeps the match exact rather
    // than fuzzy, while making it robust to the caller's normalisation form.
    const normalizedTerm = term.normalize("NFC");
    let entry = this.#chunk.terms.find(([key, name]) => key === normalizedTerm || name === normalizedTerm);

    // Palette chunks carry the source's alternative names separately. Only
    // consult them after a direct term/name miss, so a real term never loses
    // to another entry's alias.
    if (entry === undefined && this.#chunk.model === "palette") {
      const index = this.#chunk.aliases[normalizedTerm.toLowerCase()];
      if (index !== undefined) entry = this.#chunk.terms[index];
    }

    if (entry === undefined) return undefined;

    const [key, name, centroid, pCT] = entry;
    if (centroid === null) return undefined;

    return { color: Color.fromOklab(centroid[0], centroid[1], centroid[2]), term: key, name, pCT };
  }

  resolvedOptions(): ResolvedColorNamesOptions {
    const coverage = getSource(this.#options.source).languages[this.#locale];
    return {
      locale: this.#locale,
      source: this.#options.source,
      sources: [...this.#sources],
      model: this.#chunk.model,
      style: this.#options.style,
      fallback: this.#options.fallback,
      binSize: this.#chunk.model === "full" ? this.#chunk.binSize : undefined,
      coverage: coverage?.coverage ?? 0,
    };
  }
}
