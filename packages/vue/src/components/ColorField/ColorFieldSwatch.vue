<script lang="ts">
import type { Color } from "@urcolor/core";
import type { ColorSwatchRootProps } from "../ColorSwatch/ColorSwatchRoot.vue";

export interface ColorFieldSwatchProps extends /* @vue-ignore */ ColorSwatchRootProps {
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
}
</script>

<script setup lang="ts">
import { useForwardExpose } from "reka-ui";
import ColorSwatchRoot from "../ColorSwatch/ColorSwatchRoot.vue";

const _props = withDefaults(defineProps<ColorFieldSwatchProps>(), {
  as: "span",
});

useForwardExpose();
</script>

<template>
  <ColorSwatchRoot
    :as="as"
    :as-child="asChild"
    :model-value="modelValue"
    :checker-size="checkerSize"
    :alpha="alpha"
  >
    <slot />
  </ColorSwatchRoot>
</template>
