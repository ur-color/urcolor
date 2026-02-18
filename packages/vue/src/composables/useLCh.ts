import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useLCh(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "lch") as UseColorSpaceReturn<"l" | "c" | "h">;
}
