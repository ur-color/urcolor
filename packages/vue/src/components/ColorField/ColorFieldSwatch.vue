<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorFieldSwatchProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** The color to display. Applied as --color-field-swatch CSS variable. */
  color?: string;
}
</script>

<script setup lang="ts">
import { Primitive, useForwardExpose } from "reka-ui";

const props = withDefaults(defineProps<ColorFieldSwatchProps>(), {
  as: "span",
});

useForwardExpose();
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :style="{ '--color-field-swatch': color }"
  >
    <slot />
  </Primitive>
</template>
