import { Color } from "internationalized-color";
import {
  shallowRef,
  computed,
  watch,
  toValue,
  markRaw,
  type MaybeRefOrGetter,
  type ShallowRef,
  type WritableComputedRef,
} from "vue";

export type ColorInput = Color | string | null | undefined;

export interface UseColorReturn {
  color: ShallowRef<Color>;
  hex: WritableComputedRef<string>;
  alpha: WritableComputedRef<number>;
}

export function useColor(input: MaybeRefOrGetter<ColorInput>): UseColorReturn {
  const color: ShallowRef<Color> = shallowRef(parseColor(toValue(input)));

  watch(
    () => toValue(input),
    (v) => {
      color.value = parseColor(v);
    },
  );

  const hex = computed({
    get: () => color.value.toHex() ?? "#000000",
    set: (v: string) => {
      const parsed = Color.parse(v);
      if (parsed) color.value = markRaw(parsed);
    },
  });

  const alpha = computed({
    get: () => Math.round((color.value.alpha ?? 1) * 100),
    set: (v: number) => {
      color.value = markRaw(color.value.set({ alpha: v / 100 }));
    },
  });

  return { color, hex, alpha };
}

const FALLBACK = Color.parse("hsl(0, 0%, 0%)")!;

export function parseColor(input: ColorInput): Color {
  if (input instanceof Color) return markRaw(input);
  if (typeof input === "string") return markRaw(Color.parse(input) ?? FALLBACK);
  return markRaw(FALLBACK);
}
