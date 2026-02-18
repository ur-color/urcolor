import {
  colorSpaces,
  culoriToDisplay,
  displayToCulori,
} from "@urcolor/core";
import {
  computed,
  markRaw,
  type MaybeRefOrGetter,
  type WritableComputedRef,
} from "vue";
import { useColor, type ColorInput, type UseColorReturn } from "./useColor";

export function useColorSpace(input: MaybeRefOrGetter<ColorInput>, spaceName: string) {
  const { color, hex, alpha } = useColor(input);
  const spaceConfig = colorSpaces[spaceName];

  const channelRefs: Record<string, WritableComputedRef<number>> = {};

  if (spaceConfig) {
    for (const ch of spaceConfig.channels) {
      channelRefs[ch.key] = computed({
        get: () => {
          const converted = color.value.to(spaceConfig.mode);
          if (!converted) return 0;
          const raw = converted.get(ch.key, 0);
          return culoriToDisplay(ch, raw);
        },
        set: (value: number) => {
          const culoriVal = displayToCulori(ch, value);
          color.value = markRaw(color.value.set({
            mode: spaceConfig.mode,
            [ch.key]: culoriVal,
          }));
        },
      });
    }
  }

  return { color, hex, alpha, ...channelRefs };
}

export type UseColorSpaceReturn<K extends string> = UseColorReturn & {
  [P in K]: WritableComputedRef<number>;
};
