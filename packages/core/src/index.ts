// Color library (vendored; zero dependencies).
export { Color, type ColorPatch } from "./color/color";
export { parse, tryParse, registerParser, type ColorParser } from "./color/parse";
export { NOTATIONS, type NotationChannel, type NotationDef } from "./color/notations";
// Exported so a plugin can resolve a raw channel *token* (e.g. an origin's own
// notation, or for cross-checking its own token parsing) without duplicating
// core's unit/percent-reference logic — see @urcolor/relative's test suite.
export { parseChannelToken } from "./color/components";
export { serialize, type ColorFormat } from "./color/serialize";
export { convert } from "./color/convert";
export { gamutMap, inGamut } from "./color/gamut";
export { interpolate, mix, type HueMethod, type InterpolateOptions, type MixOptions } from "./color/interpolate";
export { alpha, complement, darken, desaturate, lighten, negate, rotateHue, saturate } from "./color/manipulate";
export { deltaE, deltaEOK, type DeltaEMethod } from "./color/deltaE";
export { contrast, type ContrastAlgorithm, type ContrastOptions } from "./color/contrast";
export { NAMED_COLORS, parseNamed } from "./color/named";
export { SPACES, spaceDef, hueIndexOf, channelIndexOf } from "./color/registry";
export type { ColorIn, OklchColor, P3Color, SrgbColor } from "./color/tagged";
export type { ColorObject, Coords, SpaceDef, SpaceId } from "./color/types";

// Geometry helpers.
export { polarToCartesian, cartesianToPolar, clampToCircle, normalizeAngle, triangleVertices, barycentricCoords, barycentricToCartesian, pointInTriangle, clampToTriangle, insetTriangle, type Point, type PolarCoord } from "./geometry";

// Color-space UI configuration.
export { colorSpaces, getChannelConfig, displayToNative, nativeToDisplay, type ChannelConfig, type ColorSpaceConfig } from "./color-spaces";
