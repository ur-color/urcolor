import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the HWB `h`, `w` and `b` channels. */
export declare function useHWB(input?: ColorInput): UseColorSpaceReturn<"h" | "w" | "b">;
