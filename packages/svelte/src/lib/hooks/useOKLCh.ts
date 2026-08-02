import type { ColorInput } from "./useColor.svelte.js";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace.svelte.js";

/** Reactive colour state with the OKLCh `l`, `c` and `h` channels. */
export function useOKLCh(input?: ColorInput): UseColorSpaceReturn<"l" | "c" | "h"> {
  return useColorSpace<"l" | "c" | "h">(input, "oklch");
}
