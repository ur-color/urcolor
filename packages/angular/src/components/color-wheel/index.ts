import { ColorWheelGradient } from "./gradient/color-wheel-gradient";
import { ColorWheelRoot } from "./root/color-wheel-root";
import { ColorWheelThumb } from "./thumb/color-wheel-thumb";

export {
  ColorWheelGradient,
  type ColorWheelChannelOverrides,
} from "./gradient/color-wheel-gradient";
export { COLOR_WHEEL_DEFAULT_COLOR, ColorWheelRoot } from "./root/color-wheel-root";
export { ColorWheelThumb } from "./thumb/color-wheel-thumb";

/** Every `ColorWheel` part, for a single entry in a component's `imports`. */
export const COLOR_WHEEL_DIRECTIVES = [
  ColorWheelRoot,
  ColorWheelGradient,
  ColorWheelThumb,
] as const;
