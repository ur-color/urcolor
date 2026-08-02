import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the OKLab `l`, `a` and `b` channels. */
export function useOKLab(input) {
    return useColorSpace(input, "oklab");
}
