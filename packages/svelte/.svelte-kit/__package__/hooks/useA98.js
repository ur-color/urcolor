import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the Adobe RGB (1998) `r`, `g` and `b` channels. */
export function useA98(input) {
    return useColorSpace(input, "a98-rgb");
}
