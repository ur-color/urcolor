import { ColorRingGradient } from "./gradient/color-ring-gradient";
import { ColorRingRoot } from "./root/color-ring-root";
import { ColorRingThumb } from "./thumb/color-ring-thumb";
import { ColorRingTrack } from "./track/color-ring-track";

export {
  ColorRingGradient,
  type ColorRingChannelOverrides,
} from "./gradient/color-ring-gradient";
export { COLOR_RING_DEFAULT_COLOR, ColorRingRoot } from "./root/color-ring-root";
export { ColorRingThumb } from "./thumb/color-ring-thumb";
export { ColorRingTrack } from "./track/color-ring-track";

/** Every `ColorRing` part, for a single entry in a component's `imports`. */
export const COLOR_RING_DIRECTIVES = [
  ColorRingRoot,
  ColorRingTrack,
  ColorRingGradient,
  ColorRingThumb,
] as const;
