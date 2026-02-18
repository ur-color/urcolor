import { Color } from "internationalized-color";
import {
  colorSpaces,
  culoriToDisplay,
  displayToCulori,
} from "@urcolor/core";
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

type ColorInput = Color | string | null | undefined;

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

function useColorSpace(input: MaybeRefOrGetter<ColorInput>, spaceName: string) {
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

export function useRGB(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "rgb") as UseColorReturn & {
    r: WritableComputedRef<number>;
    g: WritableComputedRef<number>;
    b: WritableComputedRef<number>;
  };
}

export function useHSL(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "hsl") as UseColorReturn & {
    h: WritableComputedRef<number>;
    s: WritableComputedRef<number>;
    l: WritableComputedRef<number>;
  };
}

export function useHSV(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "hsv") as UseColorReturn & {
    h: WritableComputedRef<number>;
    s: WritableComputedRef<number>;
    v: WritableComputedRef<number>;
  };
}

export function useHWB(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "hwb") as UseColorReturn & {
    h: WritableComputedRef<number>;
    w: WritableComputedRef<number>;
    b: WritableComputedRef<number>;
  };
}

export function useOKLCh(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "oklch") as UseColorReturn & {
    l: WritableComputedRef<number>;
    c: WritableComputedRef<number>;
    h: WritableComputedRef<number>;
  };
}

export function useOKLab(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "oklab") as UseColorReturn & {
    l: WritableComputedRef<number>;
    a: WritableComputedRef<number>;
    b: WritableComputedRef<number>;
  };
}

export function useLCh(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "lch") as UseColorReturn & {
    l: WritableComputedRef<number>;
    c: WritableComputedRef<number>;
    h: WritableComputedRef<number>;
  };
}

export function useLab(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "lab") as UseColorReturn & {
    l: WritableComputedRef<number>;
    a: WritableComputedRef<number>;
    b: WritableComputedRef<number>;
  };
}

export function useP3(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "p3") as UseColorReturn & {
    r: WritableComputedRef<number>;
    g: WritableComputedRef<number>;
    b: WritableComputedRef<number>;
  };
}

export function useA98(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "a98") as UseColorReturn & {
    r: WritableComputedRef<number>;
    g: WritableComputedRef<number>;
    b: WritableComputedRef<number>;
  };
}

export function useProPhoto(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "prophoto") as UseColorReturn & {
    r: WritableComputedRef<number>;
    g: WritableComputedRef<number>;
    b: WritableComputedRef<number>;
  };
}

export function useRec2020(input: MaybeRefOrGetter<ColorInput>) {
  return useColorSpace(input, "rec2020") as UseColorReturn & {
    r: WritableComputedRef<number>;
    g: WritableComputedRef<number>;
    b: WritableComputedRef<number>;
  };
}

const FALLBACK = Color.parse("hsl(0, 0%, 0%)")!;

function parseColor(input: ColorInput): Color {
  if (input instanceof Color) return markRaw(input);
  if (typeof input === "string") return markRaw(Color.parse(input) ?? FALLBACK);
  return markRaw(FALLBACK);
}
