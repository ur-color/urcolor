import { ColorSwatchGroupRoot } from "./root/color-swatch-group-root";

export {
  ColorSwatchGroupRoot,
  type ColorSwatchGroupItemHandle,
  type ColorSwatchGroupOrientation,
  type ColorSwatchGroupSelectionType,
} from "./root/color-swatch-group-root";

/** Every `ColorSwatchGroup` part, for a single entry in a component's `imports`. */
export const COLOR_SWATCH_GROUP_DIRECTIVES = [ColorSwatchGroupRoot] as const;
