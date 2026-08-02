import type { ColorInput } from "./color-store";
import { createColorSpaceStore, type ColorSpaceStore } from "./color-space-store";

/** Signal-backed colour state with the CIE Lab `l`, `a` and `b` channels. */
export function createLabStore(input?: ColorInput): ColorSpaceStore<"l" | "a" | "b"> {
  return createColorSpaceStore<"l" | "a" | "b">(input, "lab");
}
