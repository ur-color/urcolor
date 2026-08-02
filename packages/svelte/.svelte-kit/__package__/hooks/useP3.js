import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the Display P3 `r`, `g` and `b` channels. */
export function useP3(input) {
    return useColorSpace(input, "display-p3");
}
