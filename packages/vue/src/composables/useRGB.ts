import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useRGB(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "rgb") as UseColorSpaceReturn<"r" | "g" | "b">;
}
