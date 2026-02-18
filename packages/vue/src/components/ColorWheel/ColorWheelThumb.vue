<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorWheelThumbProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorWheelRootContext } from "./ColorWheelRoot.vue";
import ColorWheelThumbX from "./ColorWheelThumbX.vue";
import ColorWheelThumbY from "./ColorWheelThumbY.vue";

withDefaults(defineProps<ColorWheelThumbProps>(), { as: "span" });

const rootContext = injectColorWheelRootContext();
useForwardExpose();

const angleDeg = computed(() => {
  const range = rootContext.angleMax.value - rootContext.angleMin.value;
  if (range === 0) return rootContext.startAngle.value;
  const normalized = (rootContext.currentAngleValue.value - rootContext.angleMin.value) / range;
  return normalized * 360 + rootContext.startAngle.value;
});

const radiusPercent = computed(() => {
  const range = rootContext.radiusMax.value - rootContext.radiusMin.value;
  if (range === 0) return 0;
  return (rootContext.currentRadiusValue.value - rootContext.radiusMin.value) / range * 50;
});
</script>

<template>
  <Primitive
    aria-roledescription="2D slider"
    :aria-disabled="rootContext.disabled.value"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :as-child="asChild"
    :as="as"
    :style="{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `rotate(${angleDeg}deg) translateY(-${radiusPercent}cqmin) translate(-50%, -50%)`,
      transformOrigin: '0 0',
    }"
  >
    <ColorWheelThumbX />
    <ColorWheelThumbY />
    <slot />
  </Primitive>
</template>
