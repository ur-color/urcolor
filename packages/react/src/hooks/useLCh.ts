import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useLCh(input: ColorInput) {
  return useColorSpace(input, "lch") as UseColorSpaceReturn<"l" | "c" | "h">;
}
