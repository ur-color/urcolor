import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the LCh `l`, `c` and `h` channels. */
export declare function useLCh(input?: ColorInput): UseColorSpaceReturn<"l" | "c" | "h">;
