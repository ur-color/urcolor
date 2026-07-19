<script lang="ts">
import type { CheckerboardProps } from "../../shared/Checkerboard.vue";

export interface ColorWheelCheckerboardProps extends Omit<CheckerboardProps, "shape"> {}
</script>

<script setup lang="ts">
import Checkerboard from "../../shared/Checkerboard.vue";

const props = withDefaults(defineProps<ColorWheelCheckerboardProps>(), {
  as: "div",
});
</script>

<template>
  <Checkerboard
    v-bind="props"
    shape="circle"
  />
</template>
