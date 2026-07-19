/**
 * Core value types for `@urvis/color`.
 *
 * Every color, regardless of how it was written, is normalised into a
 * {@link ColorObject}: a space id, three ordered channel coordinates, and an
 * alpha. Coordinates are kept in the space's *native* units (e.g. sRGB in
 * `0..1`, hue in degrees, Lab lightness in `0..100`) and at full precision —
 * they are only clamped/quantised when serialised or gamut-mapped.
 */

/** Identifier for every CSS Color 4 space this package understands. */
export type SpaceId =
  | "srgb"
  | "srgb-linear"
  | "hsl"
  | "hwb"
  | "lab"
  | "lch"
  | "oklab"
  | "oklch"
  | "display-p3"
  | "a98-rgb"
  | "prophoto-rgb"
  | "rec2020"
  | "xyz-d65"
  | "xyz-d50";

/** Three ordered channel coordinates in a space's native units. */
export type Coords = [number, number, number];

/** A fully-resolved color: space + coordinates + alpha (`0..1`). */
export interface ColorObject {
  space: SpaceId;
  coords: Coords;
  alpha: number;
}

/**
 * A space converter + (de)serialiser. Each space converts to/from the XYZ-D65
 * hub; the registry wires these together for arbitrary conversions.
 */
export interface SpaceDef {
  /** Channel names in coordinate order, e.g. `["r", "g", "b"]`. */
  channels: readonly [string, string, string];
  /** Native coords -> XYZ-D65 (`X`, `Y`, `Z`, relative to the D65 white). */
  toXyz(coords: Coords): Coords;
  /** XYZ-D65 -> native coords. */
  fromXyz(xyz: Coords): Coords;
  /** Index of the hue channel (degrees), if the space is polar. */
  hueIndex?: number;
  /**
   * Optional direct bridge to gamma sRGB. When both source and target expose
   * one, {@link convert} routes through sRGB instead of XYZ — exact and faster
   * for the sRGB family (srgb / srgb-linear / hsl / hwb), and it avoids hue
   * noise at the 0/360 boundary that XYZ round-tripping introduces.
   */
  toSrgb?(coords: Coords): Coords;
  fromSrgb?(srgb: Coords): Coords;
}
