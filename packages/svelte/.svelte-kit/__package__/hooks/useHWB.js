import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the HWB `h`, `w` and `b` channels. */
export function useHWB(input) {
    return useColorSpace(input, "hwb");
}
