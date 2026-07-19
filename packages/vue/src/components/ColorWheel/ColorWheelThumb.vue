<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorWheelThumbProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { channelLabel, formatChannelValue } from "../../shared/channel-labels";
import { injectColorWheelRootContext } from "./ColorWheelRoot.vue";

withDefaults(defineProps<ColorWheelThumbProps>(), { as: "span" });

const rootContext = injectColorWheelRootContext();
const { forwardRef, currentElement: thumbElement } = useForwardExpose();

onMounted(() => {
  if (thumbElement.value)
    rootContext.thumbElement.value = thumbElement.value;
});
onUnmounted(() => {
  if (rootContext.thumbElement.value === thumbElement.value)
    rootContext.thumbElement.value = undefined;
});

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

const angleLabel = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.angleChannelKey.value));
const radiusLabel = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.radiusChannelKey.value));
const ariaLabel = computed(() => `${angleLabel.value}, ${radiusLabel.value}`);
const ariaValueText = computed(() => {
  const space = rootContext.colorSpace.value;
  const a = formatChannelValue(space, rootContext.angleChannelKey.value, rootContext.currentAngleValue.value);
  const r = formatChannelValue(space, rootContext.radiusChannelKey.value, rootContext.currentRadiusValue.value);
  return `${angleLabel.value} ${a}, ${radiusLabel.value} ${r}`;
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    role="slider"
    :tabindex="rootContext.disabled.value ? undefined : 0"
    :aria-label="($attrs['aria-label'] as string) || ariaLabel"
    :aria-valuenow="rootContext.currentAngleValue.value"
    :aria-valuemin="rootContext.angleMin.value"
    :aria-valuemax="rootContext.angleMax.value"
    :aria-valuetext="ariaValueText"
    aria-roledescription="Color thumb"
    :aria-disabled="rootContext.disabled.value || undefined"
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
    <slot />
  </Primitive>
</template>
