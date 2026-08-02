import type { ColorInput } from "./useColor.svelte.js";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace.svelte.js";

/** Reactive colour state with the HSL `h`, `s` and `l` channels. */
export function useHSL(input?: ColorInput): UseColorSpaceReturn<"h" | "s" | "l"> {
  return useColorSpace<"h" | "s" | "l">(input, "hsl");
}
