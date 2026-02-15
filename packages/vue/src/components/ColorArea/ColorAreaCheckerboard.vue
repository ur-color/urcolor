<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorAreaCheckerboardProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive, useForwardExpose } from "reka-ui";

withDefaults(defineProps<ColorAreaCheckerboardProps>(), {
  as: "div",
});

useForwardExpose();
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :style="{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / 16px 16px' }"
  />
</template>
