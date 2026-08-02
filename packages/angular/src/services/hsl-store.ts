import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the HSL `h`, `s` and `l` channels. */
export function createHslStore(input?: ColorInput): ColorSpaceStore<"h" | "s" | "l"> {
  return createColorSpaceStore<"h" | "s" | "l">(input, "hsl");
}
