import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the Display P3 `r`, `g` and `b` channels. */
export declare function useP3(input?: ColorInput): UseColorSpaceReturn<"r" | "g" | "b">;
