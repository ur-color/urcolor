import { Color, type SpaceId } from "@urcolor/core";
import { getChannelConfig } from "./color-spaces";
import { interpolateStops } from "./gradient";

/** Stop count the WebGL painter asks for: the shader holds 16 uniform slots. */
export const SLIDER_CANVAS_STEPS = 12;
/** Stop count a perceptual interpolation densifies to. */
export const SLIDER_INTERPOLATION_STEPS = 32;

/**
 * Channels pinned to a fixed value across the gradient, so a hue sweep is not
 * also a lightness sweep. `false` disables the whole mechanism.
 */
export type ChannelOverrides = Record<string, number> | false;

/** The default: a gradient shows the channel, not the color's transparency. */
const DEFAULT_OVERRIDES: ChannelOverrides = { alpha: 1 };

/** Applies the non-alpha overrides, then alpha, to a base color. */
export function applyChannelOverrides(
  base: Color,
  colorSpace: SpaceId,
  overrides: ChannelOverrides,
): Color {
  if (overrides === false) return base;

  const applicable: Record<string, number> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (key !== "alpha" && getChannelConfig(colorSpace, key)) applicable[key] = value;
  }

  let result = base;
  if (Object.keys(applicable).length > 0) {
    result = result.with({ space: colorSpace, ...applicable });
  }
  if (overrides.alpha !== undefined) result = result.withAlpha(overrides.alpha);
  return result;
}

/**
 * Opacity the painted surface carries.
 *
 * An alpha slider paints its own transparency into the stops, so the surface
 * stays fully opaque. Any other channel shows the color's alpha, unless an
 * override has pinned alpha, in which case the stops already carry it.
 */
export function gradientOpacity(
  color: Color,
  channel: string,
  overrides: ChannelOverrides,
): number {
  if (channel === "alpha") return 1;
  if (overrides === false || overrides.alpha === undefined) return color.alpha;
  return 1;
}

export interface SliderStopsOptions {
  /** The slider's current color. */
  color: Color;
  colorSpace: SpaceId;
  /** The channel being swept, or `"alpha"`. */
  channel: string;
  /** Explicit stops. When omitted they are computed from the channel. */
  colors?: string[];
  /** Defaults to `{ alpha: 1 }`. */
  channelOverrides?: ChannelOverrides;
  /** Interpolate in this space for perceptual accuracy. */
  interpolationSpace?: SpaceId;
  /** How many stops to compute before any interpolation. */
  steps: number;
  /** Reverse the stops rather than flipping the gradient. */
  mirrored: boolean;
}

/** Stops swept across the channel's native range, or null if unresolvable. */
function autoStops(options: SliderStopsOptions): Color[] | null {
  const { color, colorSpace, channel, channelOverrides = DEFAULT_OVERRIDES, steps } = options;
  const base = applyChannelOverrides(color, colorSpace, channelOverrides);

  if (channel === "alpha") return [base.withAlpha(0), base.withAlpha(1)];

  const config = getChannelConfig(colorSpace, channel);
  if (!config) return null;

  const min = config.nativeMin ?? config.min;
  const max = config.nativeMax ?? config.max;
  const stops: Color[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    stops.push(base.with({ space: colorSpace, [channel]: min + t * (max - min) }));
  }
  return stops;
}

/**
 * The stop list both painters draw, differing only in how many stops they can
 * hold: the shader has 16 uniform slots, CSS has no ceiling. Mirroring
 * reverses the stops rather than flipping the gradient, as the WebGL path has
 * always done.
 */
export function sliderStops(options: SliderStopsOptions): Color[] | null {
  let stops: Color[];

  if (options.colors) {
    const parsed = options.colors.map(entry => Color.parse(entry));
    if (parsed.length < 2 || parsed.some(entry => !entry)) return null;
    stops = parsed as Color[];
  } else {
    const auto = autoStops(options);
    if (!auto || auto.length < 2) return null;
    stops = auto;
  }

  if (options.mirrored) stops = [...stops].reverse();
  return options.interpolationSpace
    ? interpolateStops(stops, SLIDER_INTERPOLATION_STEPS, options.interpolationSpace)
    : stops;
}
