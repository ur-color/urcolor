<script lang="ts">
import type { CheckerboardProps } from "../../shared/Checkerboard.vue";

/**
 * @deprecated Deprecated. The Gradient component now paints the checkerboard itself, so
 * this component is no longer needed.
 */
export interface ColorSliderCheckerboardProps extends Omit<CheckerboardProps, "shape"> {}
</script>

<script setup lang="ts">
import Checkerboard from "../../shared/Checkerboard.vue";

const props = withDefaults(defineProps<ColorSliderCheckerboardProps>(), {
  as: "div",
});
</script>

<template>
  <Checkerboard
    v-bind="props"
    shape="rect"
  />
</template>
