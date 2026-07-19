<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface CheckerboardProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** `circle` rounds the checkerboard for radial surfaces such as the ring and wheel. */
  shape?: "rect" | "circle";
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";

const props = withDefaults(defineProps<CheckerboardProps>(), {
  as: "div",
  shape: "rect",
});

useForwardExpose();

const style = computed(() => ({
  position: "absolute" as const,
  inset: "0",
  pointerEvents: "none" as const,
  background: "repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / 16px 16px",
  ...(props.shape === "circle" ? { borderRadius: "50%" } : {}),
}));
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :style="style"
  />
</template>
