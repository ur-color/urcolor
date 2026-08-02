import type { ColorInput } from "./useColor.svelte.js";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace.svelte.js";

/** Reactive colour state with the Lab `l`, `a` and `b` channels. */
export function useLab(input?: ColorInput): UseColorSpaceReturn<"l" | "a" | "b"> {
  return useColorSpace<"l" | "a" | "b">(input, "lab");
}
