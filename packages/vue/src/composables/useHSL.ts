import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useHSL(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "hsl") as UseColorSpaceReturn<"h" | "s" | "l">;
}
