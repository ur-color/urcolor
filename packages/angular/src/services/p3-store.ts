import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the Display P3 `r`, `g` and `b` channels. */
export function createP3Store(input?: ColorInput): ColorSpaceStore<"r" | "g" | "b"> {
  return createColorSpaceStore<"r" | "g" | "b">(input, "display-p3");
}
