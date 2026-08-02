import { computed, type Signal } from "@angular/core";
import { colorSpaces, displayToNative, nativeToDisplay, type SpaceId } from "@urcolor/core";
import { createColorStore, type ColorInput, type ColorStore } from "./color-store";

/**
 * A {@link ColorStore} plus one readonly signal per channel of the requested
 * space and a matching `set<Channel>` method.
 */
export type ColorSpaceStore<K extends string = string> = ColorStore & {
  readonly [P in K]: Signal<number>;
} & {
  [P in K as `set${Capitalize<P>}`]: (value: number) => void;
};

/**
 * Creates signal-backed colour state projected onto one colour space — the
 * Angular counterpart of React's `useColorSpace`.
 *
 * Channel signals carry display values (the same units the sliders use),
 * converted on read and back to native on write.
 *
 * ```ts
 * const hsl = createColorSpaceStore<"h" | "s" | "l">("hsl(210, 80%, 50%)", "hsl");
 * hsl.h();          // 210
 * hsl.setS(40);     // rewrites `color` with the new saturation
 * ```
 */
export function createColorSpaceStore<K extends string = string>(
  input: ColorInput,
  spaceName: SpaceId,
): ColorSpaceStore<K> {
  const base = createColorStore(input);
  const spaceConfig = colorSpaces[spaceName];
  const store: Record<string, unknown> = { ...base };

  if (spaceConfig) {
    for (const channel of spaceConfig.channels) {
      store[channel.key] = computed(() =>
        nativeToDisplay(channel, base.color().to(spaceConfig.space).get(channel.key)),
      );
      const capitalized = channel.key.charAt(0).toUpperCase() + channel.key.slice(1);
      store[`set${capitalized}`] = (value: number): void => {
        base.color.update(prev =>
          prev.with({
            space: spaceConfig.space,
            [channel.key]: displayToNative(channel, value),
          }),
        );
      };
    }
  }

  return store as ColorSpaceStore<K>;
}
