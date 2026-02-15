<script lang="ts">
import type { SliderThumbProps } from "reka-ui";

export interface ColorSliderThumbProps extends /* @vue-ignore */ SliderThumbProps {}
</script>

<script setup lang="ts">
import { SliderThumb, useForwardExpose } from "reka-ui";

defineProps<ColorSliderThumbProps>();
useForwardExpose();
</script>

<template>
  <SliderThumb>
    <slot />
  </SliderThumb>
</template>
