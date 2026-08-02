import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the HWB `h`, `w` and `b` channels. */
export function createHwbStore(input?: ColorInput): ColorSpaceStore<"h" | "w" | "b"> {
  return createColorSpaceStore<"h" | "w" | "b">(input, "hwb");
}
