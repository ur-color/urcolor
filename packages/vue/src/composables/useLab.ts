import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useLab(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "lab") as UseColorSpaceReturn<"l" | "a" | "b">;
}
