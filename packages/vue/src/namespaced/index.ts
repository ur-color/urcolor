import {
  ColorAreaRoot,
  ColorAreaArea,
  ColorAreaGradient,
  ColorAreaCheckerboard,
  ColorAreaThumb,
} from "../components/ColorArea";
import {
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderRange,
  ColorSliderThumb,
  ColorSliderGradient,
  ColorSliderCheckerboard,
} from "../components/ColorSlider";
import {
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
  ColorFieldSwatch,
} from "../components/ColorField";
import { ColorSwatchRoot } from "../components/ColorSwatch";
import {
  ColorSwatchPickerRoot,
  ColorSwatchPickerItem,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerItemIndicator,
} from "../components/ColorSwatchPicker";
import {
  ColorRingRoot,
  ColorRingTrack,
  ColorRingGradient,
  ColorRingCheckerboard,
  ColorRingThumb,
} from "../components/ColorRing";
import {
  ColorWheelRoot,
  ColorWheelGradient,
  ColorWheelCheckerboard,
  ColorWheelThumb,
} from "../components/ColorWheel";
import {
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleCheckerboard,
  ColorTriangleThumb,
} from "../components/ColorTriangle";

export const ColorArea = {
  Root: ColorAreaRoot,
  // `Area` is not optional: the root carries no pointer or keyboard handlers,
  // so a picker assembled without it renders correctly and does not respond to
  // input at all.
  Area: ColorAreaArea,
  Gradient: ColorAreaGradient,
  /** @deprecated The Gradient component now paints the checkerboard itself; remove this component. */
  Checkerboard: ColorAreaCheckerboard,
  Thumb: ColorAreaThumb,
};

export const ColorSlider = {
  Root: ColorSliderRoot,
  Track: ColorSliderTrack,
  Range: ColorSliderRange,
  Thumb: ColorSliderThumb,
  Gradient: ColorSliderGradient,
  /** @deprecated The Gradient component now paints the checkerboard itself; remove this component. */
  Checkerboard: ColorSliderCheckerboard,
};

export const ColorField = {
  Root: ColorFieldRoot,
  Input: ColorFieldInput,
  Increment: ColorFieldIncrement,
  Decrement: ColorFieldDecrement,
  Swatch: ColorFieldSwatch,
};

export const ColorSwatch = {
  Root: ColorSwatchRoot,
};

export const ColorSwatchPicker = {
  Root: ColorSwatchPickerRoot,
  Item: ColorSwatchPickerItem,
  ItemSwatch: ColorSwatchPickerItemSwatch,
  ItemIndicator: ColorSwatchPickerItemIndicator,
};

export const ColorRing = {
  Root: ColorRingRoot,
  Track: ColorRingTrack,
  Gradient: ColorRingGradient,
  /** @deprecated The Gradient component now paints the checkerboard itself; remove this component. */
  Checkerboard: ColorRingCheckerboard,
  Thumb: ColorRingThumb,
};

export const ColorWheel = {
  Root: ColorWheelRoot,
  Gradient: ColorWheelGradient,
  /** @deprecated The Gradient component now paints the checkerboard itself; remove this component. */
  Checkerboard: ColorWheelCheckerboard,
  Thumb: ColorWheelThumb,
};

export const ColorTriangle = {
  Root: ColorTriangleRoot,
  Gradient: ColorTriangleGradient,
  /** @deprecated The Gradient component now paints the checkerboard itself; remove this component. */
  Checkerboard: ColorTriangleCheckerboard,
  Thumb: ColorTriangleThumb,
};
