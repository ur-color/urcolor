import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the OKLab `l`, `a` and `b` channels. */
export function createOklabStore(input?: ColorInput): ColorSpaceStore<"l" | "a" | "b"> {
  return createColorSpaceStore<"l" | "a" | "b">(input, "oklab");
}
