<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
import { Color } from "@urcolor/core";

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

const color = computed(() => (props.modelValue ? Color.from(props.modelValue) : undefined));

const opaqueString = computed(() => {
  if (!color.value) return "transparent";
  const c = color.value.withAlpha(1);
  const srgb = c.to("srgb");
  return srgb.toString();
});

const alphaValue = computed(() => {
  if (!color.value) return 1;
  return color.value.alpha;
});

const colorString = computed(() => {
  if (!color.value) return "transparent";
  if (!props.alpha) return opaqueString.value;
  const srgb = color.value.to("srgb");
  return srgb.toString();
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
