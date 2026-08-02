import type { ColorInput } from "./useColor.svelte.js";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace.svelte.js";

/** Reactive colour state with the HSV `h`, `s` and `v` channels. */
export function useHSV(input?: ColorInput): UseColorSpaceReturn<"h" | "s" | "v"> {
  return useColorSpace<"h" | "s" | "v">(input, "hsv");
}
