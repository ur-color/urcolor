<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorRingThumbProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorRingRootContext } from "./ColorRingRoot.vue";

withDefaults(defineProps<ColorRingThumbProps>(), { as: "span" });

const rootContext = injectColorRingRootContext();
useForwardExpose();

const angleDeg = computed(() => {
  const range = rootContext.max.value - rootContext.min.value;
  if (range === 0) return rootContext.startAngle.value;
  const normalized = (rootContext.currentValue.value - rootContext.min.value) / range;
  return normalized * 360 + rootContext.startAngle.value;
});
</script>

<template>
  <Primitive
    role="slider"
    tabindex="0"
    :aria-valuenow="rootContext.currentValue.value"
    :aria-valuemin="rootContext.min.value"
    :aria-valuemax="rootContext.max.value"
    :aria-disabled="rootContext.disabled.value"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :as-child="asChild"
    :as="as"
    :style="{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `rotate(${angleDeg}deg) translateY(-50cqmin) translate(-50%, -50%)`,
      transformOrigin: '0 0',
    }"
  >
    <slot />
  </Primitive>
</template>
