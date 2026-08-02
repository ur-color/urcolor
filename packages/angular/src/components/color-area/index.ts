import { ColorAreaGradient } from "./gradient/color-area-gradient";
import { ColorAreaRoot } from "./root/color-area-root";
import { ColorAreaThumb } from "./thumb/color-area-thumb";

export {
  ColorAreaGradient,
  type ColorAreaChannelOverrides,
} from "./gradient/color-area-gradient";
export {
  COLOR_AREA_DEFAULT_COLOR,
  ColorAreaRoot,
  type ColorAreaThumbAlignment,
} from "./root/color-area-root";
export { ColorAreaThumb } from "./thumb/color-area-thumb";

/** Every `ColorArea` part, for a single entry in a component's `imports`. */
export const COLOR_AREA_DIRECTIVES = [ColorAreaRoot, ColorAreaGradient, ColorAreaThumb] as const;
