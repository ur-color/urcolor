<script lang="ts">
import type { SliderRangeProps } from "../../primitives/types";

export interface ColorSliderRangeProps extends /* @vue-ignore */ SliderRangeProps {}
</script>

<script setup lang="ts">
import { SliderRange, useForwardExpose } from "reka-ui";

defineProps<ColorSliderRangeProps>();
useForwardExpose();
</script>

<template>
  <SliderRange>
    <slot />
  </SliderRange>
</template>
