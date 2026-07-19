import { Color } from "@urcolor/core";
import { filterSupportedLocales, negotiateLocale } from "./engine/locale";
import { getLoadedChunk, getSource, loadChunk } from "./engine/registry";
import { lookupFull, type Candidate } from "./engine/lookup-full";
import { lookupHue } from "./engine/lookup-hue";
import type { Chunk } from "./engine/types";

export interface ColorNamesOptions {
  /** Which dataset answers. Required — provenance is never implicit. */
  source: string;
  /** `"long"` gives the display name, `"short"` the matching key. */
  style?: "long" | "short";
  /** `"none"` makes `of()` return undefined unless the bin matched exactly. */
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

  /** The colour's name in this locale, or `undefined` when unavailable. */
  of(color: Color): string | undefined {
    const result = this.resolve(color);
    if (result.coverage === "none") return undefined;
    if (result.coverage === "nearest" && this.#options.fallback === "none") return undefined;
    return this.#options.style === "short" ? result.term : result.name;
  }

  /** The full result, including candidates, probabilities, and coverage. */
  resolve(color: Color): ColorNameResolution {
    const { source, topN, maxDistance, fallback } = this.#options;
    const effectiveMaxDistance = fallback === "none" ? 0 : maxDistance;

    const match = this.#chunk.model === "full"
      ? lookupFull(this.#chunk, oklabOf(color), { topN, maxDistance: effectiveMaxDistance })
      : lookupHue(this.#chunk, color, {
          topN,
          maxDistance: effectiveMaxDistance,
          maxHueDistance: MAX_HUE_DISTANCE,
        });

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
