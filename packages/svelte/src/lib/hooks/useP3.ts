import type { ColorInput } from "./useColor.svelte.js";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace.svelte.js";

/** Reactive colour state with the Display P3 `r`, `g` and `b` channels. */
export function useP3(input?: ColorInput): UseColorSpaceReturn<"r" | "g" | "b"> {
  return useColorSpace<"r" | "g" | "b">(input, "display-p3");
}
