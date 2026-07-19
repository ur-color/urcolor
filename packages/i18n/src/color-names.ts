import { Color } from "@urcolor/core";
import { filterSupportedLocales, negotiateLocale } from "./engine/locale";
import { getLoadedChunk, getSource, loadChunk } from "./engine/registry";
import { lookupFull, type BinMatch, type Candidate } from "./engine/lookup-full";
import { lookupHue, type HueMatch } from "./engine/lookup-hue";
import type { Chunk } from "./engine/types";

export interface ColorNamesOptions {
  /** Which dataset answers. Required — provenance is never implicit. */
  source: string;
  /** `"long"` gives the display name, `"short"` the matching key. */
  style?: "long" | "short";
  /**
   * `"none"` makes `of()` return undefined unless the bin matched exactly.
   * Only affects full-model locales: the hue model's lookup never reports
   * `"nearest"` coverage (see {@link HueMatch}), so there is nothing for
   * `fallback: "none"` to filter out for the 6 hue-model locales
   * (`ar da el hu it tr`) — it's a no-op there.
   */
  fallback?: "nearest" | "none";
  /** Oklab search radius used when `fallback` is `"nearest"`. */
  maxDistance?: number;
  /** How many candidates `resolve()` returns. */
  topN?: number;
}

export interface ColorNameResolution {
  name: string | undefined;
  term: string | undefined;
  probability: number;
  candidates: Candidate[];
  model: "full" | "hue";
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
  model: "full" | "hue";
  style: "long" | "short";
  fallback: "nearest" | "none";
  binSize: number | undefined;
  coverage: number;
}

const DEFAULT_MAX_DISTANCE = 0.075;
const DEFAULT_TOP_N = 5;

/**
 * The hue model only describes the saturated hue ring; beyond this Oklab
 * distance from it, the model has nothing meaningful to say.
 */
const MAX_HUE_DISTANCE = 0.2;

function localesOf(sourceId: string): string[] {
  return Object.keys(getSource(sourceId).languages);
}

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
 * names.of(Color.parse("#3b82f6")!); // "파란색"
 * ```
 */
export class ColorNames {
  readonly #locale: string;
  readonly #options: Required<Omit<ColorNamesOptions, "source">> & { source: string };
  readonly #chunk: Chunk;

  constructor(locales: string | readonly string[], options: ColorNamesOptions) {
    const available = localesOf(options.source);
    const locale = negotiateLocale(locales, available);
    if (locale === undefined) {
      throw new RangeError(
        `Source "${options.source}" has no data for the requested locale(s). `
        + "Use ColorNames.supportedLocalesOf() to check first.",
      );
    }

    const chunk = getLoadedChunk(options.source, locale);
    if (chunk === undefined) {
      throw new Error(
        `Colour data for "${locale}" from source "${options.source}" is not loaded. `
        + `Call await ColorNames.load(${JSON.stringify(locales)}, ${JSON.stringify(options)}) first.`,
      );
    }

    this.#locale = locale;
    this.#chunk = chunk;
    this.#options = {
      source: options.source,
      style: options.style ?? "long",
      fallback: options.fallback ?? "nearest",
      maxDistance: options.maxDistance ?? DEFAULT_MAX_DISTANCE,
      topN: options.topN ?? DEFAULT_TOP_N,
    };
  }

  /** Resolve the locale, load its chunk, and construct an instance. */
  static async load(
    locales: string | readonly string[],
    options: ColorNamesOptions,
  ): Promise<ColorNames> {
    const locale = negotiateLocale(locales, localesOf(options.source));
    if (locale === undefined) {
      throw new RangeError(
        `Source "${options.source}" has no data for the requested locale(s).`,
      );
    }
    await loadChunk(options.source, locale);
    return new ColorNames(locale, options);
  }

  static supportedLocalesOf(
    locales: string | readonly string[],
    options: { source: string },
  ): string[] {
    return filterSupportedLocales(locales, localesOf(options.source));
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

    const match = this.#chunk.model === "full"
      ? lookupFull(this.#chunk, oklabOf(color), { topN, maxDistance })
      : lookupHue(this.#chunk, color, { topN, maxHueDistance: MAX_HUE_DISTANCE });

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

  resolveColorOf(term: string): { color: Color; term: string; name: string } | undefined {
    // Shipped data is normalised to NFC (composed) at generation time, but a
    // caller may pass NFD (decomposed) — macOS filesystem APIs and some IMEs
    // produce it — which renders identically but fails `===`. Normalise the
    // input, not the comparison strategy: this keeps the match exact rather
    // than fuzzy, while making it robust to the caller's normalisation form.
    const normalizedTerm = term.normalize("NFC");
    const entry = this.#chunk.terms.find(([key, name]) => key === normalizedTerm || name === normalizedTerm);
    if (entry === undefined) return undefined;

    const [key, name, centroid] = entry;
    if (centroid === null) return undefined;

    return { color: Color.fromOklab(centroid[0], centroid[1], centroid[2]), term: key, name };
  }

  resolvedOptions(): ResolvedColorNamesOptions {
    const coverage = getSource(this.#options.source).languages[this.#locale];
    return {
      locale: this.#locale,
      source: this.#options.source,
      model: this.#chunk.model,
      style: this.#options.style,
      fallback: this.#options.fallback,
      binSize: this.#chunk.model === "full" ? this.#chunk.binSize : undefined,
      coverage: coverage?.coverage ?? 0,
    };
  }
}
