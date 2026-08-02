import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the A98 RGB `r`, `g` and `b` channels. */
export function createA98Store(input?: ColorInput): ColorSpaceStore<"r" | "g" | "b"> {
  return createColorSpaceStore<"r" | "g" | "b">(input, "a98-rgb");
}
