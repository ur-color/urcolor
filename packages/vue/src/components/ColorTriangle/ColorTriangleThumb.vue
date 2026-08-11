<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorTriangleThumbProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { barycentricFromChannels, barycentricToCartesian, insetTriangle } from "@urcolor/shared";
import { channelLabel, formatChannelValue } from "../../shared/channel-labels";
import { injectColorTriangleRootContext } from "./ColorTriangleRoot.vue";

withDefaults(defineProps<ColorTriangleThumbProps>(), { as: "span" });

const rootContext = injectColorTriangleRootContext();
const { forwardRef, currentElement } = useForwardExpose();

// Register thumb element in root context for size measurement
onMounted(() => {
  rootContext.thumbElement.value = currentElement.value;
});

const thumbPosition = computed(() => {
  const { u, v, w } = barycentricFromChannels(
    { value: rootContext.currentXValue.value, min: rootContext.xMin.value, max: rootContext.xMax.value },
    { value: rootContext.currentYValue.value, min: rootContext.yMin.value, max: rootContext.yMax.value },
    rootContext.isThreeChannel.value
      ? { value: rootContext.currentZValue.value, min: rootContext.zMin.value, max: rootContext.zMax.value }
      : undefined,
  );

  const [v0, v1, v2] = rootContext.vertices.value;

  // In contain mode, position thumb within inset triangle
  let posVerts: [typeof v0, typeof v1, typeof v2] = [v0, v1, v2];
  if (rootContext.thumbAlignment.value === "contain" && currentElement.value) {
    const rootEl = currentElement.value.closest("[data-color-triangle-root]") as HTMLElement | null;
    if (rootEl) {
      const containerSize = Math.min(rootEl.clientWidth, rootEl.clientHeight);
      if (containerSize > 0) {
        const thumbW = currentElement.value.clientWidth;
        const thumbH = currentElement.value.clientHeight;
        const inset = Math.max(thumbW, thumbH) / 2 / containerSize;
        if (inset > 0) {
          posVerts = insetTriangle(v0, v1, v2, inset);
        }
      }
    }
  }

  const pos = barycentricToCartesian(u, v, w, posVerts[0], posVerts[1], posVerts[2]);

  return {
    left: `${pos.x * 100}%`,
    top: `${pos.y * 100}%`,
  };
});

const space = computed(() => rootContext.colorSpace.value);
const labels = computed(() => {
  const base = [
    channelLabel(space.value, rootContext.xChannelKey.value),
    channelLabel(space.value, rootContext.yChannelKey.value),
  ];
  if (rootContext.isThreeChannel.value)
    base.push(channelLabel(space.value, rootContext.zChannelKey.value ?? ""));
  return base;
});
const ariaLabel = computed(() => labels.value.join(", "));
const ariaValueText = computed(() => {
  const parts = [
    `${labels.value[0]} ${formatChannelValue(space.value, rootContext.xChannelKey.value, rootContext.currentXValue.value)}`,
    `${labels.value[1]} ${formatChannelValue(space.value, rootContext.yChannelKey.value, rootContext.currentYValue.value)}`,
  ];
  if (rootContext.isThreeChannel.value)
    parts.push(`${labels.value[2]} ${formatChannelValue(space.value, rootContext.zChannelKey.value ?? "", rootContext.currentZValue.value)}`);
  return parts.join(", ");
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    role="slider"
    :tabindex="rootContext.disabled.value ? undefined : 0"
    :aria-label="($attrs['aria-label'] as string) || ariaLabel"
    :aria-valuenow="rootContext.currentXValue.value"
    :aria-valuemin="rootContext.xMin.value"
    :aria-valuemax="rootContext.xMax.value"
    :aria-valuetext="ariaValueText"
    aria-roledescription="Color thumb"
    :aria-disabled="rootContext.disabled.value || undefined"
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
