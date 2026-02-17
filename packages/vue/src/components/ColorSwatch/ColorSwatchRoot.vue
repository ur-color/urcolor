<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
import { Color } from "internationalized-color";

export interface ColorSwatchRootProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** The color value to display. */
  modelValue?: Color | string | null;
  /** The checkerboard size in pixels. */
  checkerSize?: number;
  /** When true, reflects the color's alpha channel. When false, displays the color as fully opaque. */
  alpha?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";

const props = withDefaults(defineProps<ColorSwatchRootProps>(), {
  as: "div",
  checkerSize: 16,
});

const { forwardRef } = useForwardExpose();

function parseColor(v: Color | string | null | undefined): Color | undefined {
  if (!v) return undefined;
  if (v instanceof Color) return v;
  return Color.parse(v) ?? undefined;
}

const color = computed(() => parseColor(props.modelValue));

const opaqueString = computed(() => {
  if (!color.value) return "transparent";
  const c = color.value.set({ alpha: 1 });
  if (!c) return "transparent";
  const srgb = c.to("rgb");
  if (!srgb) return "transparent";
  return srgb.toString("css");
});

const alphaValue = computed(() => {
  if (!color.value) return 1;
  return color.value.alpha ?? 1;
});

const colorString = computed(() => {
  if (!color.value) return "transparent";
  if (!props.alpha) return opaqueString.value;
  const srgb = color.value.to("rgb");
  if (!srgb) return "transparent";
  return srgb.toString("css");
});

const swatchStyle = computed(() => {
  const size = props.checkerSize;
  const checkerboard = `repeating-conic-gradient(rgb(230, 230, 230) 0%, rgb(230, 230, 230) 25%, white 0%, white 50%) 0% 50% / ${size}px ${size}px`;
  return {
    "--swatch-color-opaque": opaqueString.value,
    "--swatch-alpha": alphaValue.value,
    "--swatch-checkerboard": checkerboard,
    "--swatch-color": colorString.value,
    "background": `linear-gradient(${colorString.value}, ${colorString.value}), ${checkerboard}`,
  };
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    role="img"
    :style="swatchStyle"
  >
    <slot />
  </Primitive>
</template>
