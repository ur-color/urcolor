import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useHWB(input: ColorInput) {
  return useColorSpace(input, "hwb") as UseColorSpaceReturn<"h" | "w" | "b">;
}
