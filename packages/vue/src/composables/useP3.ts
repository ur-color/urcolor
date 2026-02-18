import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useP3(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "p3") as UseColorSpaceReturn<"r" | "g" | "b">;
}
