import type { ColorInput } from "./useColor.svelte.js";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace.svelte.js";

/** Reactive colour state with the ProPhoto RGB `r`, `g` and `b` channels. */
export function useProPhoto(input?: ColorInput): UseColorSpaceReturn<"r" | "g" | "b"> {
  return useColorSpace<"r" | "g" | "b">(input, "prophoto-rgb");
}
