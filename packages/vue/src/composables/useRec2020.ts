import type { MaybeRefOrGetter } from "vue";
import type { ColorInput } from "./useColor";
import { useColorSpace, type UseColorSpaceReturn } from "./useColorSpace";

export function useRec2020(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "rec2020") as UseColorSpaceReturn<"r" | "g" | "b">;
}
