import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the HSV `h`, `s` and `v` channels. */
export function createHsvStore(input?: ColorInput): ColorSpaceStore<"h" | "s" | "v"> {
  return createColorSpaceStore<"h" | "s" | "v">(input, "hsv");
}
