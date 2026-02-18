import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useOKLCh(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "oklch") as UseColorSpaceReturn<"l" | "c" | "h">;
}
