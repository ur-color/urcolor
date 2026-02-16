import type { Color } from "internationalized-color";
import { reactive, type MaybeRefOrGetter } from "vue";

export function useColor(input: MaybeRefOrGetter<Color | string | null | undefined>) {
  return reactive({

  });
}
