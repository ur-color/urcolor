/**
 * `Color` — an immutable, Temporal-shaped facade over the functional core.
 * Every method returns a new `Color`; nothing mutates in place. Import this
 * only when you want the ergonomic object; the standalone functions
 * (`parse`, `convert`, `serialize`, …) stay tree-shakeable on their own.
 *
 * Immutability is structural rather than enforced by `Object.freeze`: `space`
 * and `alpha` are `readonly`, the coordinate tuple lives in a `#private` field,
 * and `get coords()` hands back a copy. Freezing every instance cost ~400 ns
 * apiece — more than the color math itself — which made per-pixel work like
 * gradient sampling an order of magnitude slower than it needed to be.
 */

import { type ContrastOptions, contrast } from "./contrast";
import { convert } from "./convert";
import { type DeltaEMethod, deltaE } from "./deltaE";
import { gamutMap, inGamut } from "./gamut";
import { type MixOptions, mix } from "./interpolate";
import { complement, darken, desaturate, lighten, negate, rotateHue, saturate } from "./manipulate";
import { parse, tryParse } from "./parse";
import { channelIndexOf, spaceDef } from "./registry";
import { type ColorFormat, serialize } from "./serialize";
import type { ColorObject, Coords, SpaceId } from "./types";

/**
 * A `with()` patch: any subset of a space's channels, plus `alpha`, plus an
 * optional `space` to convert into *before* the channels are applied.
 */
export type ColorPatch = {
  space?: SpaceId;
  alpha?: number;
} & Record<string, number | SpaceId | undefined>;

export class Color {
  /** Space of this color's stored coordinates. */
  readonly space: SpaceId;
  /** Alpha in `0..1`. */
  readonly alpha: number;
  readonly #coords: Coords;

  constructor(space: SpaceId, coords: Coords, alpha = 1) {
    this.space = space;
    this.#coords = [coords[0], coords[1], coords[2]];
    this.alpha = alpha;
  }

  /** The coordinate tuple (a fresh copy — safe to mutate). */
  get coords(): Coords {
    return [this.#coords[0], this.#coords[1], this.#coords[2]];
  }

  // --- Construction --------------------------------------------------------

  /**
   * Build from a CSS string, a packed `0xRRGGBB` integer, a {@link ColorObject},
   * or another `Color`.
   */
  static from(input: string | number | ColorObject | Color): Color {
    if (input instanceof Color) return input;
    if (typeof input === "number") {
      const hex = ((input >>> 0) & 0xffffff).toString(16).padStart(6, "0");
      const o = parse(`#${hex}`);
      return new Color(o.space, o.coords, o.alpha);
    }
    if (typeof input === "string") {
      const o = parse(input);
      return new Color(o.space, o.coords, o.alpha);
    }
    return new Color(input.space, input.coords, input.alpha);
  }

  /**
   * Parse a CSS color string, or `null` when it isn't one. The nullable
   * counterpart to {@link Color.from}, which throws.
   */
  static parse(input: string): Color | null {
    const o = tryParse(input);
    return o === null ? null : new Color(o.space, o.coords, o.alpha);
  }

  static fromHex(hex: string): Color {
    return Color.from(hex);
  }

  /** `r,g,b` in `0..255`. */
  static fromRgb(r: number, g: number, b: number, a = 1): Color {
    return new Color("srgb", [r / 255, g / 255, b / 255], a);
  }

  /** `h` in degrees, `s`/`l` in `0..1`. */
  static fromHsl(h: number, s: number, l: number, a = 1): Color {
    return new Color("hsl", [h, s, l], a);
  }

  /** `h` in degrees, `w`/`b` in `0..1`. */
  static fromHwb(h: number, w: number, b: number, a = 1): Color {
    return new Color("hwb", [h, w, b], a);
  }

  static fromLab(l: number, aa: number, bb: number, a = 1): Color {
    return new Color("lab", [l, aa, bb], a);
  }

  static fromLch(l: number, c: number, h: number, a = 1): Color {
    return new Color("lch", [l, c, h], a);
  }

  static fromOklab(l: number, aa: number, bb: number, a = 1): Color {
    return new Color("oklab", [l, aa, bb], a);
  }

  static fromOklch(l: number, c: number, h: number, a = 1): Color {
    return new Color("oklch", [l, c, h], a);
  }

  static fromXyz(x: number, y: number, z: number, a = 1): Color {
    return new Color("xyz-d65", [x, y, z], a);
  }

  // --- Conversion ----------------------------------------------------------

  /**
   * Convert to `space`, returning a new `Color` (lossless in precision).
   *
   * `convert` only reads its argument, so the intermediate is built inline
   * rather than via `toObject()` — that skips one object and one coords copy
   * per call, which the grid samplers pay per pixel.
   */
  to(space: SpaceId): Color {
    // Deliberately still allocates when `space` is already this space: `to()`
    // has always returned a distinct instance, and identity is observable.
    const c = this.#coords;
    const o = convert({ space: this.space, coords: [c[0], c[1], c[2]], alpha: this.alpha }, space);
    return new Color(space, o.coords, o.alpha);
  }

  /** Gamut-map into `dest` (default sRGB); returns an Oklch `Color`. */
  toGamut(dest: SpaceId = "srgb"): Color {
    const o = gamutMap(this.toObject(), dest);
    return new Color(o.space, o.coords, o.alpha);
  }

  /** The plain {@link ColorObject} form. */
  toObject(): ColorObject {
    return { space: this.space, coords: this.coords, alpha: this.alpha };
  }

  /** Whether this color fits within `dest`'s gamut (default sRGB). */
  inGamut(dest: SpaceId = "srgb"): boolean {
    return inGamut(this.toObject(), dest);
  }

  // --- Queries / updaters --------------------------------------------------

  /** Read a channel value by name (in the current space). */
  get(channel: string): number {
    const i = channelIndexOf(this.space, channel);
    if (i < 0) throw new RangeError(`No channel "${channel}" in ${this.space}`);
    return this.#coords[i] as number;
  }

  /**
   * Copy with the given channels and/or `alpha` overridden. When `patch.space`
   * is present the color is converted into that space first, and the channel
   * names are resolved against it — a convert-and-set in one call.
   */
  with(patch: ColorPatch): Color {
    const target = patch.space ?? this.space;
    const c = this.#coords;
    // Convert straight into the working coords rather than by way of an
    // intermediate `Color`; `spaceDef` still validates an unknown target.
    let coords: Coords;
    let baseAlpha: number;
    if (target === this.space) {
      spaceDef(target);
      coords = [c[0], c[1], c[2]];
      baseAlpha = this.alpha;
    } else {
      const o = convert({ space: this.space, coords: [c[0], c[1], c[2]], alpha: this.alpha }, target);
      coords = o.coords;
      baseAlpha = o.alpha;
    }
    // `Object.keys` over `Object.entries`: same own-enumerable keys in the same
    // order, without materialising a pair array per call.
    for (const key of Object.keys(patch)) {
      if (key === "space" || key === "alpha") continue;
      const value = patch[key];
      if (value === undefined) continue;
      const i = channelIndexOf(target, key);
      if (i < 0) throw new RangeError(`No channel "${key}" in ${target}`);
      if (typeof value !== "number") {
        throw new TypeError(`Channel "${key}" must be a number, got ${JSON.stringify(value)}`);
      }
      coords[i] = value;
    }
    return new Color(target, coords, patch.alpha ?? baseAlpha);
  }

  /** Copy with alpha set to `value`. */
  withAlpha(value: number): Color {
    return new Color(this.space, this.coords, value);
  }

  // --- Relations -----------------------------------------------------------

  /** Structural equality (compared in this color's space, within `epsilon`). */
  equals(other: Color, epsilon = 1e-4): boolean {
    const o = convert(other.toObject(), this.space);
    if (Math.abs(o.alpha - this.alpha) > epsilon) return false;
    return this.#coords.every((c, i) => Math.abs(c - (o.coords[i] as number)) <= epsilon);
  }

  /** Blend toward `other` by `amount` (default 0.5). */
  mix(other: Color, amount = 0.5, options?: MixOptions): Color {
    const o = mix(this.toObject(), other.toObject(), amount, options);
    return new Color(o.space, o.coords, o.alpha);
  }

  /** Color difference to `other` (defaults to CIEDE2000). */
  deltaE(other: Color, method?: DeltaEMethod): number {
    return deltaE(this.toObject(), other.toObject(), method);
  }

  /** Contrast against `other` (defaults to the WCAG 2.1 ratio). */
  contrast(other: Color, options?: ContrastOptions): number {
    return contrast(this.toObject(), other.toObject(), options);
  }

  // --- Manipulation (sugar) ------------------------------------------------

  lighten(amount?: number): Color {
    return Color.from(lighten(this.toObject(), amount));
  }

  darken(amount?: number): Color {
    return Color.from(darken(this.toObject(), amount));
  }

  saturate(amount?: number): Color {
    return Color.from(saturate(this.toObject(), amount));
  }

  desaturate(amount?: number): Color {
    return Color.from(desaturate(this.toObject(), amount));
  }

  rotateHue(degrees: number): Color {
    return Color.from(rotateHue(this.toObject(), degrees));
  }

  negate(): Color {
    return Color.from(negate(this.toObject()));
  }

  complement(): Color {
    return Color.from(complement(this.toObject()));
  }

  // --- Serialization -------------------------------------------------------

  /** CSS string, in the given format or this color's own space notation. */
  toString(format?: ColorFormat): string {
    return serialize(this.toObject(), format);
  }

  /** JSON form is the CSS string (round-trips via {@link Color.from}). */
  toJSON(): string {
    return this.toString();
  }

  /** Throws, mirroring `Temporal.*` — colors have no numeric coercion. */
  valueOf(): never {
    throw new TypeError("Color has no primitive value; use toString() or coords");
  }
}

/**
 * `markRaw`'s marker, carried on the prototype.
 *
 * Vue skips reactive-proxying a value that is frozen *or* flagged this way.
 * Freezing used to earn the skip as a side effect; without it a `Color` handed
 * to `ref()`/`reactive()` — or to a component as a prop — gets wrapped in a
 * `Proxy`, and reading `#coords` through that proxy is a `TypeError`, since a
 * private field lives on the instance and the proxy is not it.
 *
 * On the prototype rather than as a field: it costs nothing per instance, and
 * stays non-enumerable so it never turns up in a spread or `Object.keys`.
 * Harmless in React/Svelte/Angular, which don't proxy class instances.
 */
Object.defineProperty(Color.prototype, "__v_skip", { value: true });
