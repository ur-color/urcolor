export { ColorRingRoot, type ColorRingRootProps } from "./root/ColorRingRoot";
export { ColorRingTrack, type ColorRingTrackProps } from "./track/ColorRingTrack";
export { ColorRingGradient, type ColorRingGradientProps } from "./gradient/ColorRingGradient";
/** @deprecated The Gradient component now paints the checkerboard itself; remove this component. */
export { ColorRingCheckerboard, type ColorRingCheckerboardProps } from "./checkerboard/ColorRingCheckerboard";
export { ColorRingThumb, type ColorRingThumbProps } from "./thumb/ColorRingThumb";
export { useColorRingContext } from "./root/ColorRingRootContext";

export * as ColorRing from "./index.parts";
