/**
 * `@urvis/color` — a CSS Color Module 4 toolkit: parse, convert, serialize,
 * gamut-map, interpolate, and analyze colors. A pure tree-shakeable functional
 * core with an ergonomic, Temporal-shaped immutable {@link Color} class on top.
 *
 * Import the functions for the smallest bundles; import {@link Color} when you
 * want the object API (it pulls in the full space registry).
 */

// The ergonomic class.
export { Color, type ColorPatch } from "./color";
export {
  type ContrastAlgorithm,
  type ContrastOptions,
  contrast,
} from "./contrast";
export { convert } from "./convert";
export { type DeltaEMethod, deltaE, deltaEOK } from "./deltaE";
// Gamut, interpolation, analysis, manipulation.
export { gamutMap, inGamut } from "./gamut";
export {
  type HueMethod,
  type InterpolateOptions,
  interpolate,
  type MixOptions,
  mix,
} from "./interpolate";
export {
  alpha,
  complement,
  darken,
  desaturate,
  lighten,
  negate,
  rotateHue,
  saturate,
} from "./manipulate";
// Named colors.
export { NAMED_COLORS, parseNamed } from "./named";
// Functional core: parse / convert / serialize.
export { parse, tryParse } from "./parse";
// Registry (advanced: custom pipelines).
export { hueIndexOf, SPACES, spaceDef } from "./registry";
export { type ColorFormat, serialize } from "./serialize";
// Type-level color-space tagging.
export type { ColorIn, OklchColor, P3Color, SrgbColor } from "./tagged";
// Core value types.
export type { ColorObject, Coords, SpaceDef, SpaceId } from "./types";
