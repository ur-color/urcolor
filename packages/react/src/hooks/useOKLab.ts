import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useOKLab(input: ColorInput) {
  return useColorSpace(input, "oklab") as UseColorSpaceReturn<"l" | "a" | "b">;
}
