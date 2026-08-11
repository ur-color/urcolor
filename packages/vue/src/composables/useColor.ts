import { Color, type SpaceId } from "@urcolor/core";
import { channelsOf, type ChannelConfig } from "@urcolor/shared";
import {
  shallowRef,
  computed,
  watch,
  toValue,
  markRaw,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
  type WritableComputedRef,
} from "vue";

export type ColorInput = Color | string | null | undefined;

export interface UseColorReturn {
  color: ShallowRef<Color>;
  hex: WritableComputedRef<string>;
  alpha: WritableComputedRef<number>;
  /**
   * The channels of the color's own space, ready to render one field per
   * channel. Pass `space` to `useColor` to pin them instead.
   */
  channels: ComputedRef<readonly ChannelConfig[]>;
}

/**
 * Reactive color state.
 *
 * `space` decides what `channels` describes. Left out, it follows the color's
 * own space, which is what a single-space editor wants. A picker that mixes
 * spaces should pass one: writing through a control converts the color into
 * that control's space, so an HSV area would otherwise renumber a set of HSL
 * fields under the user mid-drag.
 */
export function useColor(
  input: MaybeRefOrGetter<ColorInput>,
  space?: MaybeRefOrGetter<SpaceId | undefined>,
): UseColorReturn {
  const color: ShallowRef<Color> = shallowRef(parseColor(toValue(input)));

  watch(
    () => toValue(input),
    (v) => {
      color.value = parseColor(v);
    },
  );

  const hex = computed({
    get: () => color.value.toString("hex"),
    set: (v: string) => {
      const parsed = Color.parse(v);
      if (parsed) color.value = markRaw(parsed);
    },
  });

  const alpha = computed({
    get: () => Math.round(color.value.alpha * 100),
    set: (v: number) => {
      color.value = markRaw(color.value.withAlpha(v / 100));
    },
  });

  const channels = computed(() => channelsOf(toValue(space) ?? color.value.space));

  return { color, hex, alpha, channels };
}

const FALLBACK = Color.parse("hsl(0, 0%, 0%)")!;

export function parseColor(input: ColorInput): Color {
  if (input instanceof Color) return markRaw(input);
  if (typeof input === "string") return markRaw(Color.parse(input) ?? FALLBACK);
  return markRaw(FALLBACK);
}
