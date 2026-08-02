import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the HSL `h`, `s` and `l` channels. */
export function useHSL(input) {
    return useColorSpace(input, "hsl");
}
