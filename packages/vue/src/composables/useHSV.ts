import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useHSV(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "hsv") as UseColorSpaceReturn<"h" | "s" | "v">;
}
