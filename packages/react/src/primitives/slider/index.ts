import { SliderRoot } from "./SliderRoot";
import { SliderControl } from "./SliderControl";
import { SliderTrack } from "./SliderTrack";
import { SliderIndicator } from "./SliderIndicator";
import { SliderThumb } from "./SliderThumb";

/**
 * The internal slider primitive, built on `@urcolor/shared`.
 *
 * It replaces `@base-ui-components/react/slider`, which pulled a React 19
 * dependency into a package that also has to compile under `preact/compat`.
 * Not exported from the package.
 */
export const Slider = {
  Root: SliderRoot,
  Control: SliderControl,
  Track: SliderTrack,
  Indicator: SliderIndicator,
  Thumb: SliderThumb,
};

export type { SliderRootProps } from "./SliderRoot";
export type { SliderControlProps } from "./SliderControl";
export type { SliderTrackProps } from "./SliderTrack";
export type { SliderIndicatorProps } from "./SliderIndicator";
export type { SliderThumbProps } from "./SliderThumb";
