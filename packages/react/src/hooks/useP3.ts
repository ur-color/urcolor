import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useP3(input: ColorInput) {
  return useColorSpace(input, "p3") as UseColorSpaceReturn<"r" | "g" | "b">;
}
