import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the Rec. 2020 `r`, `g` and `b` channels. */
export function useRec2020(input) {
    return useColorSpace(input, "rec2020");
}
