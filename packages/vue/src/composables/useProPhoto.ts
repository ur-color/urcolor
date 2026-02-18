import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useProPhoto(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "prophoto") as UseColorSpaceReturn<"r" | "g" | "b">;
}
