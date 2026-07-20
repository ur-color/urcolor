export { ColorAreaRoot, type ColorAreaRootProps } from "./root/ColorAreaRoot";
export { ColorAreaGradient, type ColorAreaGradientProps } from "./gradient/ColorAreaGradient";
/** @deprecated The Gradient component now paints the checkerboard itself; remove this component. */
export { ColorAreaCheckerboard, type ColorAreaCheckerboardProps } from "./checkerboard/ColorAreaCheckerboard";
export { ColorAreaThumb, type ColorAreaThumbProps } from "./thumb/ColorAreaThumb";
export { useColorAreaContext } from "./root/ColorAreaRootContext";

export * as ColorArea from "./index.parts";
