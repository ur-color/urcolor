import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the Rec. 2020 `r`, `g` and `b` channels. */
export function createRec2020Store(input?: ColorInput): ColorSpaceStore<"r" | "g" | "b"> {
  return createColorSpaceStore<"r" | "g" | "b">(input, "rec2020");
}
