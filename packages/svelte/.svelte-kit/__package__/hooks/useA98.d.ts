import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the Adobe RGB (1998) `r`, `g` and `b` channels. */
export declare function useA98(input?: ColorInput): UseColorSpaceReturn<"r" | "g" | "b">;
