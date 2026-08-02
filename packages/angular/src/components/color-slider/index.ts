import { ColorSliderControl } from "./control/color-slider-control";
import { ColorSliderGradient } from "./gradient/color-slider-gradient";
import { ColorSliderRange } from "./range/color-slider-range";
import { ColorSliderRoot } from "./root/color-slider-root";
import { ColorSliderThumb } from "./thumb/color-slider-thumb";
import { ColorSliderTrack } from "./track/color-slider-track";

export { ColorSliderControl } from "./control/color-slider-control";
export {
  ColorSliderGradient,
  type ColorSliderChannelOverrides,
} from "./gradient/color-slider-gradient";
export { ColorSliderRange } from "./range/color-slider-range";
export {
  COLOR_SLIDER_DEFAULT_COLOR,
  ColorSliderRoot,
  type ColorSliderOrientation,
} from "./root/color-slider-root";
export { ColorSliderThumb } from "./thumb/color-slider-thumb";
export { ColorSliderTrack } from "./track/color-slider-track";

/** Every `ColorSlider` part, for a single entry in a component's `imports`. */
export const COLOR_SLIDER_DIRECTIVES = [
  ColorSliderRoot,
  ColorSliderControl,
  ColorSliderTrack,
  ColorSliderRange,
  ColorSliderThumb,
  ColorSliderGradient,
] as const;
