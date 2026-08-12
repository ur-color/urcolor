<script lang="ts">
import type { SliderTrackProps } from "../../primitives/types";

export interface ColorSliderTrackProps extends /* @vue-ignore */ SliderTrackProps {}
</script>

<script setup lang="ts">
import { SliderTrack, useForwardExpose } from "reka-ui";

defineProps<ColorSliderTrackProps>();
useForwardExpose();
</script>

<template>
  <SliderTrack>
    <slot />
  </SliderTrack>
</template>
