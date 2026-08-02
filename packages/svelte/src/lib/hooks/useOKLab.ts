import type { ColorInput } from "./useColor.svelte.js";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace.svelte.js";

/** Reactive colour state with the OKLab `l`, `a` and `b` channels. */
export function useOKLab(input?: ColorInput): UseColorSpaceReturn<"l" | "a" | "b"> {
  return useColorSpace<"l" | "a" | "b">(input, "oklab");
}
