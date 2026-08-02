import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the sRGB `r`, `g` and `b` channels. */
export declare function useRGB(input?: ColorInput): UseColorSpaceReturn<"r" | "g" | "b">;
