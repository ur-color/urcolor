<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorTriangleThumbProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { barycentricToCartesian } from "@urcolor/core";
import { injectColorTriangleRootContext } from "./ColorTriangleRoot.vue";

withDefaults(defineProps<ColorTriangleThumbProps>(), { as: "span" });

const rootContext = injectColorTriangleRootContext();
useForwardExpose();

const thumbPosition = computed(() => {
  const xVal = rootContext.currentXValue.value;
  const yVal = rootContext.currentYValue.value;
  const xMin = rootContext.xMin.value;
  const xMax = rootContext.xMax.value;
  const yMin = rootContext.yMin.value;
  const yMax = rootContext.yMax.value;
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  let u: number, v: number, w: number;

  if (rootContext.isThreeChannel.value) {
    // 3-channel: v0→(xMax,yMin,zMin), v1→(xMin,yMax,zMin), v2→(xMin,yMin,zMax)
    const zVal = rootContext.currentZValue.value;
    const zMin = rootContext.zMin.value;
    const zMax = rootContext.zMax.value;
    const zRange = zMax - zMin;
    const rawU = xRange === 0 ? 0 : (xVal - xMin) / xRange;
    const rawV = yRange === 0 ? 0 : (yVal - yMin) / yRange;
    const rawW = zRange === 0 ? 0 : (zVal - zMin) / zRange;
    // Normalize so they sum to 1
    const sum = rawU + rawV + rawW || 1;
    u = rawU / sum;
    v = rawV / sum;
    w = rawW / sum;
  } else {
    // 2-channel: v0→(xMax,yMax), v1→(xMin,yMax), v2→(xMin,yMin)
    u = xRange === 0 ? 0 : (xVal - xMin) / xRange;
    w = yRange === 0 ? 0 : 1 - (yVal - yMin) / yRange;
    v = Math.max(0, 1 - u - w);
  }

  const [v0, v1, v2] = rootContext.vertices.value;
  const pos = barycentricToCartesian(u, v, w, v0, v1, v2);

  return {
    left: `${pos.x * 100}%`,
    top: `${pos.y * 100}%`,
  };
});
</script>

<template>
  <Primitive
    role="slider"
    tabindex="0"
    aria-roledescription="2D slider"
    :aria-valuenow="rootContext.currentXValue.value"
    :aria-valuemin="rootContext.xMin.value"
    :aria-valuemax="rootContext.xMax.value"
    :aria-disabled="rootContext.disabled.value"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :as-child="asChild"
    :as="as"
    :style="{
      position: 'absolute',
      left: thumbPosition.left,
      top: thumbPosition.top,
      transform: 'translate(-50%, -50%)',
    }"
  >
    <slot />
  </Primitive>
</template>
