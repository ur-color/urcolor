import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the sRGB `r`, `g` and `b` channels. */
export function useRGB(input) {
    return useColorSpace(input, "srgb");
}
