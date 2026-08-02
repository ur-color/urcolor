import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the sRGB `r`, `g` and `b` channels. */
export function createRgbStore(input?: ColorInput): ColorSpaceStore<"r" | "g" | "b"> {
  return createColorSpaceStore<"r" | "g" | "b">(input, "srgb");
}
