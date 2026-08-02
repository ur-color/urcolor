import { useColorSpace } from "./useColorSpace.svelte.js";
/** Reactive colour state with the Lab `l`, `a` and `b` channels. */
export function useLab(input) {
    return useColorSpace(input, "lab");
}
