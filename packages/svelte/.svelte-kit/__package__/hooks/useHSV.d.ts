import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the HSV `h`, `s` and `v` channels. */
export declare function useHSV(input?: ColorInput): UseColorSpaceReturn<"h" | "s" | "v">;
