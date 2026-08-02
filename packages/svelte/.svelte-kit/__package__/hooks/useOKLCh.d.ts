import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the OKLCh `l`, `c` and `h` channels. */
export declare function useOKLCh(input?: ColorInput): UseColorSpaceReturn<"l" | "c" | "h">;
