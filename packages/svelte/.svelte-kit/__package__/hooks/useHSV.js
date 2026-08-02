import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the HSV `h`, `s` and `v` channels. */
export function useHSV(input) {
    return useColorSpace(input, "hsv");
}
