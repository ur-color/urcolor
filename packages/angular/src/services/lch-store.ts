import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the CIE LCh `l`, `c` and `h` channels. */
export function createLchStore(input?: ColorInput): ColorSpaceStore<"l" | "c" | "h"> {
  return createColorSpaceStore<"l" | "c" | "h">(input, "lch");
}
