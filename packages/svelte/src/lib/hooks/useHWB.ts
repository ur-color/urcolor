import type { ColorInput } from "./useColor.svelte.js";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace.svelte.js";

/** Reactive colour state with the HWB `h`, `w` and `b` channels. */
export function useHWB(input?: ColorInput): UseColorSpaceReturn<"h" | "w" | "b"> {
  return useColorSpace<"h" | "w" | "b">(input, "hwb");
}
