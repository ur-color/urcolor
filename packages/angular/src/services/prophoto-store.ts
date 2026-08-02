import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the ProPhoto RGB `r`, `g` and `b` channels. */
export function createProPhotoStore(input?: ColorInput): ColorSpaceStore<"r" | "g" | "b"> {
  return createColorSpaceStore<"r" | "g" | "b">(input, "prophoto-rgb");
}
