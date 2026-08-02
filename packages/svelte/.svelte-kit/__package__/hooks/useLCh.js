import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the LCh `l`, `c` and `h` channels. */
export function useLCh(input) {
    return useColorSpace(input, "lch");
}
