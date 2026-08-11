import type { Color } from "@urcolor/core";
import { CHECKERBOARD_BACKGROUND, CHECKERBOARD_VARS } from "./canvas";
import { parseColor } from "./channel-model";

/**
 * The custom properties a swatch publishes. They are *outputs*: each one is
 * derived from the `value` prop and written inline, so an author stylesheet
 * cannot override them without `!important`. Read them to style overlays.
 *
 * The *inputs* a consumer sets instead live on the checkerboard —
 * `--urcolor-checkerboard-dark`, `--urcolor-checkerboard-light` and
 * `--urcolor-checkerboard-size` — and are never written inline unless the
 * matching prop asks for it.
 */
export const SWATCH_VARS = {
  color: "--urcolor-swatch-color",
  colorOpaque: "--urcolor-swatch-color-opaque",
  alpha: "--urcolor-swatch-alpha",
  checkerboard: "--urcolor-swatch-checkerboard",
  background: "--urcolor-swatch-background",
} as const;

/**
 * The pre-`urcolor` names, still emitted as aliases of their replacements.
 *
 * @deprecated Read the `--urcolor-swatch-*` properties instead. These are kept
 * for one major so existing overlays keep painting.
 */
export const LEGACY_SWATCH_VARS = {
  color: "--swatch-color",
  colorOpaque: "--swatch-color-opaque",
  alpha: "--swatch-alpha",
  checkerboard: "--swatch-checkerboard",
} as const;

/**
 * The colour is painted as a flat gradient rather than a `background-color` so
 * that it composites over the checkerboard in a single declaration: a
 * background colour paints *below* every background image, which would leave
 * the checkerboard covering it.
 *
 * It reads the custom properties rather than inlining the resolved colour, so
 * overriding one repaints the swatch without a re-render.
 */
export const SWATCH_BACKGROUND
  = `linear-gradient(var(${SWATCH_VARS.color}), var(${SWATCH_VARS.color})), var(${SWATCH_VARS.checkerboard})`;

/**
 * What the swatch's `background` shorthand actually holds. The recipe is parked
 * in a custom property for the same reason the checkerboard's is; see
 * `CHECKERBOARD_STYLE`.
 */
export const SWATCH_BACKGROUND_REF = `var(${SWATCH_VARS.background})`;

/** The resolved colour strings a swatch paints from. */
export interface SwatchPaint {
  /** The painted colour, honouring `alpha`. `transparent` when there is none. */
  color: string;
  /** The same colour forced to alpha 1. */
  colorOpaque: string;
  /** The colour's alpha channel. `1` when there is no colour. */
  alpha: number;
}

/**
 * Resolve a swatch's value to the three colour strings it publishes. An absent
 * or unparseable value still yields all three, so consumer styling never has to
 * guard for a missing property.
 */
export function swatchPaint(
  value: Color | string | null | undefined,
  showAlpha = false,
): SwatchPaint {
  const color = parseColor(value);
  if (!color) return { color: "transparent", colorOpaque: "transparent", alpha: 1 };

  const colorOpaque = color.withAlpha(1).to("srgb").toString();
  return {
    color: showAlpha ? color.to("srgb").toString() : colorOpaque,
    colorOpaque,
    alpha: color.alpha,
  };
}

export interface SwatchStyleOptions extends SwatchPaint {
  /**
   * The checkerboard's tile size, in pixels. Left `undefined` the property is
   * not written at all, which leaves `--urcolor-checkerboard-size` free for an
   * author stylesheet to set; it falls back to `16px`.
   */
  checkerSize?: number;
}

/**
 * Every declaration a swatch element carries: the published custom properties,
 * their deprecated aliases, and the `background` that composites the colour
 * over the transparency grid.
 *
 * `background` references the properties rather than inlining the colour, so
 * overriding one repaints the swatch.
 */
export function swatchStyle(options: SwatchStyleOptions): Record<string, string> {
  const { color, colorOpaque, alpha, checkerSize } = options;

  const style: Record<string, string> = {
    [SWATCH_VARS.color]: color,
    [SWATCH_VARS.colorOpaque]: colorOpaque,
    [SWATCH_VARS.alpha]: String(alpha),
    [SWATCH_VARS.checkerboard]: CHECKERBOARD_BACKGROUND,
    [SWATCH_VARS.background]: SWATCH_BACKGROUND,
    // The resolved values rather than `var()` references to their replacements.
    // A reference would read identically in CSS but not to `getPropertyValue`,
    // which returns an inline property unresolved — so anything reading these
    // from script would have got the literal text `var(--urcolor-swatch-color)`.
    // Nothing is lost by duplicating: an inline property cannot be overridden
    // from a stylesheet, so there is no linkage for a reference to preserve.
    [LEGACY_SWATCH_VARS.color]: color,
    [LEGACY_SWATCH_VARS.colorOpaque]: colorOpaque,
    [LEGACY_SWATCH_VARS.alpha]: String(alpha),
    [LEGACY_SWATCH_VARS.checkerboard]: CHECKERBOARD_BACKGROUND,
    background: SWATCH_BACKGROUND_REF,
  };

  if (checkerSize !== undefined) style[CHECKERBOARD_VARS.size] = `${checkerSize}px`;
  return style;
}

/** Serialise a style record into an inline `style` string. */
export function styleToString(style: Record<string, string>): string {
  let out = "";
  for (const property in style) out += `${hyphenate(property)}:${style[property]};`;
  return out;
}

function hyphenate(property: string): string {
  if (property.startsWith("--")) return property;
  return property.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`);
}
