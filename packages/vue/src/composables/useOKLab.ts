import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useOKLab(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "oklab") as UseColorSpaceReturn<"l" | "a" | "b">;
}
