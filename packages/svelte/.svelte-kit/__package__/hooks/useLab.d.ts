import type { ColorInput } from "./useColor.svelte.js";
import { type UseColorSpaceReturn } from "./useColorSpace.svelte.js";
/** Reactive colour state with the Lab `l`, `a` and `b` channels. */
export declare function useLab(input?: ColorInput): UseColorSpaceReturn<"l" | "a" | "b">;
