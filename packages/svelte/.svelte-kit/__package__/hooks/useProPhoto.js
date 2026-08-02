import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the ProPhoto RGB `r`, `g` and `b` channels. */
export function useProPhoto(input) {
    return useColorSpace(input, "prophoto-rgb");
}
