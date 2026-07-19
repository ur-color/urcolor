import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useProPhoto(input: ColorInput) {
  return useColorSpace(input, "prophoto-rgb") as UseColorSpaceReturn<"r" | "g" | "b">;
}
