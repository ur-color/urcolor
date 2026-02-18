import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useA98(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "a98") as UseColorSpaceReturn<"r" | "g" | "b">;
}
