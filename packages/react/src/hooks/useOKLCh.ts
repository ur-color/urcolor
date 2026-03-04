import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useOKLCh(input: ColorInput) {
  return useColorSpace(input, "oklch") as UseColorSpaceReturn<"l" | "c" | "h">;
}
