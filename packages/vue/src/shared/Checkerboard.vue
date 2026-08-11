<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

/**
 * @deprecated The standalone Checkerboard components are deprecated. The Gradient
 * components now paint the checkerboard themselves, so these components are no
 * longer needed.
 */
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
import { CHECKERBOARD_STYLE, warnCheckerboardDeprecated } from "./checkerboard";

const props = withDefaults(defineProps<CheckerboardProps>(), {
  as: "div",
  shape: "rect",
});

warnCheckerboardDeprecated();

useForwardExpose();

const style = computed(() => ({
  position: "absolute" as const,
  inset: "0",
  pointerEvents: "none" as const,
  ...CHECKERBOARD_STYLE,
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
