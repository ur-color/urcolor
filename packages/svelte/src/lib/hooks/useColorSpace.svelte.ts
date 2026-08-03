import type { SpaceId } from "@urcolor/core";
import { colorSpaces, displayToNative, nativeToDisplay } from "@urcolor/shared";
import { useColor, type ColorInput, type UseColorReturn } from "./useColor.svelte.js";

/**
 * `useColor` plus one readonly getter per channel of the requested space and a
 * matching `set<Channel>` method.
 */
export type UseColorSpaceReturn<K extends string> = UseColorReturn & {
  readonly [P in K]: number;
} & {
  [P in K as `set${Capitalize<P>}`]: (value: number) => void;
};

/**
 * Reactive colour state projected onto one colour space.
 *
 * Channel values are display values (the same units the sliders use), converted
 * on read and back on write.
 */
export function useColorSpace<K extends string = string>(
  input: ColorInput,
  spaceName: SpaceId,
): UseColorSpaceReturn<K> {
  const base = useColor(input);
  const spaceConfig = colorSpaces[spaceName];

  const channels = $derived.by<Record<string, number>>(() => {
    if (!spaceConfig) return {};
    const converted = base.color.to(spaceConfig.space);
    const result: Record<string, number> = {};
    for (const ch of spaceConfig.channels) {
      result[ch.key] = nativeToDisplay(ch, converted.get(ch.key));
    }
    return result;
  });

  const result: Record<string, unknown> = {
    get color() {
      return base.color;
    },
    setColor: base.setColor,
    get hex() {
      return base.hex;
    },
    setHex: base.setHex,
    get alpha() {
      return base.alpha;
    },
    setAlpha: base.setAlpha,
  };

  if (spaceConfig) {
    for (const ch of spaceConfig.channels) {
      Object.defineProperty(result, ch.key, {
        enumerable: true,
        get: () => channels[ch.key],
      });
      const capitalized = ch.key.charAt(0).toUpperCase() + ch.key.slice(1);
      result[`set${capitalized}`] = (value: number): void => {
        base.setColor(prev =>
          prev.with({ space: spaceConfig.space, [ch.key]: displayToNative(ch, value) }),
        );
      };
    }
  }

  return result as UseColorSpaceReturn<K>;
}
