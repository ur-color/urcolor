import { ColorFieldDecrement } from "./decrement/color-field-decrement";
import { ColorFieldIncrement } from "./increment/color-field-increment";
import { ColorFieldInput } from "./input/color-field-input";
import { ColorFieldRoot } from "./root/color-field-root";
import { ColorFieldSwatch } from "./swatch/color-field-swatch";

export { ColorFieldDecrement } from "./decrement/color-field-decrement";
export { ColorFieldIncrement } from "./increment/color-field-increment";
export { ColorFieldInput } from "./input/color-field-input";
export {
  COLOR_FIELD_DEFAULT_COLOR,
  ColorFieldRoot,
  type ColorFieldFormat,
} from "./root/color-field-root";
export { ColorFieldSwatch } from "./swatch/color-field-swatch";

/** Every `ColorField` part, for a single entry in a component's `imports`. */
export const COLOR_FIELD_DIRECTIVES = [
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
  ColorFieldSwatch,
] as const;
