import { ColorTriangleGradient } from "./gradient/color-triangle-gradient";
import { ColorTriangleRoot } from "./root/color-triangle-root";
import { ColorTriangleThumb } from "./thumb/color-triangle-thumb";

export {
  ColorTriangleGradient,
  type ColorTriangleChannelOverrides,
} from "./gradient/color-triangle-gradient";
export {
  COLOR_TRIANGLE_DEFAULT_COLOR,
  ColorTriangleRoot,
  type ColorTriangleThumbAlignment,
} from "./root/color-triangle-root";
export { ColorTriangleThumb } from "./thumb/color-triangle-thumb";

/** Every `ColorTriangle` part, for a single entry in a component's `imports`. */
export const COLOR_TRIANGLE_DIRECTIVES = [
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleThumb,
] as const;
