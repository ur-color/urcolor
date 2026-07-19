import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useRGB(input: ColorInput) {
  return useColorSpace(input, "srgb") as UseColorSpaceReturn<"r" | "g" | "b">;
}
