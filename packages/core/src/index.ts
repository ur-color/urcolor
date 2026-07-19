// Color library (vendored; zero dependencies).
export { Color, type ColorPatch } from "./color/color";
export { parse, tryParse } from "./color/parse";
export { serialize, type ColorFormat } from "./color/serialize";
export { convert } from "./color/convert";
export { gamutMap, inGamut } from "./color/gamut";
export { interpolate, mix, type HueMethod, type InterpolateOptions, type MixOptions } from "./color/interpolate";
export { alpha, complement, darken, desaturate, lighten, negate, rotateHue, saturate } from "./color/manipulate";
export { deltaE, deltaEOK, type DeltaEMethod } from "./color/deltaE";
export { contrast, type ContrastAlgorithm, type ContrastOptions } from "./color/contrast";
export { NAMED_COLORS, parseNamed } from "./color/named";
export { SPACES, spaceDef, hueIndexOf } from "./color/registry";
export type { ColorIn, OklchColor, P3Color, SrgbColor } from "./color/tagged";
export type { ColorObject, Coords, SpaceDef, SpaceId } from "./color/types";

// Gradient rendering.
export { drawGradient, drawLinearGradient, interpolateStops, sampleBilinearGrid, sampleChannelGrid, sampleTriangleGrid, samplePolarGrid, sampleConicRing } from "./gradient";

// Geometry helpers.
export { polarToCartesian, cartesianToPolar, clampToCircle, normalizeAngle, triangleVertices, barycentricCoords, barycentricToCartesian, pointInTriangle, clampToTriangle, insetTriangle, type Point, type PolarCoord } from "./geometry";

// Color-space UI configuration.
export { colorSpaces, getChannelConfig, displayToNative, nativeToDisplay, type ChannelConfig, type ColorSpaceConfig } from "./color-spaces";

// Channel-label translations.
export { translations, getChannelLabel, type ChannelTranslations } from "./i18n";
