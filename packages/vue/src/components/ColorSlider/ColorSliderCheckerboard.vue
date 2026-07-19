<script lang="ts">
import type { CheckerboardProps } from "../../shared/Checkerboard.vue";

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
