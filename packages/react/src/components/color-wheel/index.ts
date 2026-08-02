export { ColorWheelRoot, type ColorWheelRootProps } from "./root/ColorWheelRoot";
export { ColorWheelGradient, type ColorWheelGradientProps } from "./gradient/ColorWheelGradient";
/** @deprecated The Gradient component now paints the checkerboard itself; remove this component. */
export { ColorWheelCheckerboard, type ColorWheelCheckerboardProps } from "./checkerboard/ColorWheelCheckerboard";
export { ColorWheelThumb, type ColorWheelThumbProps } from "./thumb/ColorWheelThumb";
export { useColorWheelContext } from "./root/ColorWheelRootContext";

export * as ColorWheel from "./index.parts";
