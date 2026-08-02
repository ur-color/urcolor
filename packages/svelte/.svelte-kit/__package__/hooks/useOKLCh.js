import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the OKLCh `l`, `c` and `h` channels. */
export function useOKLCh(input) {
    return useColorSpace(input, "oklch");
}
