<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
import { useForwardExpose, Primitive } from "reka-ui";

export interface ColorAreaRegionProps extends /* @vue-ignore */ PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { convertValueToPercentage } from "./utils";
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";

withDefaults(defineProps<ColorAreaRegionProps>(), { as: "span" });
const rootContext = injectColorAreaRootContext();

useForwardExpose();

const percentagesX = computed(() => rootContext.currentModelValue.value.map(v =>
  convertValueToPercentage(v[0] ?? 0, rootContext.minX.value ?? 0, rootContext.maxX.value ?? 100),
));

const percentagesY = computed(() => rootContext.currentModelValue.value.map(v =>
  convertValueToPercentage(v[1] ?? 0, rootContext.minY.value ?? 0, rootContext.maxY.value ?? 100),
));

const regionBounds = computed(() => {
  const pctX = percentagesX.value;
  const pctY = percentagesY.value;

  if (pctX.length === 0)
    return { startX: 0, startY: 0, endX: 0, endY: 0 };

  // Single thumb: region from top-left (0,0) to thumb
  if (pctX.length === 1)
    return { startX: 0, startY: 0, endX: pctX[0], endY: pctY[0] };

  // Multiple thumbs: region spans from min to max across all thumbs
  return {
    startX: Math.min(...pctX),
    startY: Math.min(...pctY),
    endX: Math.max(...pctX),
    endY: Math.max(...pctY),
  };
});

const startEdgeX = computed(() => rootContext.isSlidingFromLeft.value ? "left" : "right");
const endEdgeX = computed(() => rootContext.isSlidingFromLeft.value ? "right" : "left");
const startEdgeY = computed(() => rootContext.isSlidingFromTop.value ? "top" : "bottom");
const endEdgeY = computed(() => rootContext.isSlidingFromTop.value ? "bottom" : "top");
</script>

<template>
  <Primitive
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :as-child="asChild"
    :as="as"
    :style="{
      position: 'absolute',
      [startEdgeX]: `${regionBounds.startX}%`,
      [endEdgeX]: `${100 - (regionBounds.endX ?? 0)}%`,
      [startEdgeY]: `${regionBounds.startY}%`,
      [endEdgeY]: `${100 - (regionBounds.endY ?? 0)}%`,
    }"
  >
    <slot />
  </Primitive>
</template>
