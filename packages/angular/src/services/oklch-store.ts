import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the OKLCh `l`, `c` and `h` channels. */
export function createOklchStore(input?: ColorInput): ColorSpaceStore<"l" | "c" | "h"> {
  return createColorSpaceStore<"l" | "c" | "h">(input, "oklch");
}
