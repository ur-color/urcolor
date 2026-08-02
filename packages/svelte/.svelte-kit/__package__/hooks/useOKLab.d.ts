import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the OKLab `l`, `a` and `b` channels. */
export declare function useOKLab(input?: ColorInput): UseColorSpaceReturn<"l" | "a" | "b">;
