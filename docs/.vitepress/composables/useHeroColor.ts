import type { InjectionKey, ShallowRef } from "vue";
import { inject, provide, shallowRef } from "vue";
import { Color } from "@urcolor/core";

const HERO_COLOR_KEY: InjectionKey<ShallowRef<Color>> = Symbol("hero-color");

/** Hue 328 at full saturation and value — the magenta the hero has always opened on. */
export function provideHeroColor(): ShallowRef<Color> {
  const color = shallowRef<Color>(new Color("hsv", [328, 1, 1]));
  provide(HERO_COLOR_KEY, color);
  return color;
}

export function useHeroColor(): ShallowRef<Color> {
  const color = inject(HERO_COLOR_KEY);
  if (!color) {
    throw new Error("useHeroColor() called outside a provideHeroColor() tree");
  }
  return color;
}

/**
 * The urcolor primitives emit `Color | undefined`; `undefined` means "no
 * change". Every satellite funnels its update through here so that guard
 * lives in exactly one place.
 */
export function setHeroColor(target: ShallowRef<Color>, next: Color | undefined): void {
  if (next) target.value = next;
}
