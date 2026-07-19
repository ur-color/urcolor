import {
  colorSpaces,
  nativeToDisplay,
  displayToNative,
  type SpaceId,
} from "@urcolor/core";
import {
  computed,
  markRaw,
  type MaybeRefOrGetter,
  type WritableComputedRef,
} from "vue";
import { useColor, type ColorInput, type UseColorReturn } from "./useColor";

export function useColorSpace(input: MaybeRefOrGetter<ColorInput>, spaceName: SpaceId) {
  const { color, hex, alpha } = useColor(input);
  const spaceConfig = colorSpaces[spaceName];

  const channelRefs: Record<string, WritableComputedRef<number>> = {};

  if (spaceConfig) {
    for (const ch of spaceConfig.channels) {
      channelRefs[ch.key] = computed({
        get: () => {
          const converted = color.value.to(spaceConfig.space);
          const raw = converted.get(ch.key);
          return nativeToDisplay(ch, raw);
        },
        set: (value: number) => {
          const nativeVal = displayToNative(ch, value);
          color.value = markRaw(color.value.with({
            space: spaceConfig.space,
            [ch.key]: nativeVal,
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
