import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the ProPhoto RGB `r`, `g` and `b` channels. */
export declare function useProPhoto(input?: ColorInput): UseColorSpaceReturn<"r" | "g" | "b">;
