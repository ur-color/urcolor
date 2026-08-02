import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the HSL `h`, `s` and `l` channels. */
export declare function useHSL(input?: ColorInput): UseColorSpaceReturn<"h" | "s" | "l">;
