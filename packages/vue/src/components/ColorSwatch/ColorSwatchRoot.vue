<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
import type { Color } from "@urcolor/core";

export interface ColorSwatchRootProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** The color value to display. */
  modelValue?: Color | string | null;
  /**
   * The checkerboard size in pixels. Left unset, the grid reads
   * `--urcolor-checkerboard-size` and falls back to `16px`.
   */
  checkerSize?: number;
  /** When true, reflects the color's alpha channel. When false, displays the color as fully opaque. */
  alpha?: boolean;
  /** Accessible name for the swatch. Falls back to the resolved colour string, then "transparent". */
  label?: string;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { parseColor, swatchPaint, swatchStyle as buildSwatchStyle } from "@urcolor/shared";

const props = withDefaults(defineProps<ColorSwatchRootProps>(), {
  as: "div",
});

const { forwardRef } = useForwardExpose();

const color = computed(() => parseColor(props.modelValue));
const paint = computed(() => swatchPaint(props.modelValue, props.alpha));

const alphaValue = computed(() => paint.value.alpha);
const colorString = computed(() => paint.value.color);

const swatchStyle = computed(() =>
  buildSwatchStyle({ ...paint.value, checkerSize: props.checkerSize }),
);

// An invisible swatch: either there's no color at all, or the color's
// alpha channel is fully transparent. Either way, nothing is visible.
const hasColor = computed(() => Boolean(color.value) && alphaValue.value > 0);
const accessibleName = computed(() => props.label ?? (hasColor.value ? colorString.value : "transparent"));

defineSlots<{
  default?: (props: { color: string; alpha: number }) => any;
}>();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    role="img"
    :aria-label="accessibleName"
    aria-roledescription="color swatch"
    :data-no-color="hasColor ? undefined : ''"
    :style="swatchStyle"
  >
    <slot
      :color="colorString"
      :alpha="alphaValue"
    />
  </Primitive>
</template>
