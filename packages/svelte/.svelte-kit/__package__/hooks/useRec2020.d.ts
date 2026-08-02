import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the Rec. 2020 `r`, `g` and `b` channels. */
export declare function useRec2020(input?: ColorInput): UseColorSpaceReturn<"r" | "g" | "b">;
