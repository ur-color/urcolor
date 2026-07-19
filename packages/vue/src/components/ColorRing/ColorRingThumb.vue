<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorRingThumbProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { channelLabel, formatChannelValue } from "../../shared/channel-labels";
import { injectColorRingRootContext } from "./ColorRingRoot.vue";

withDefaults(defineProps<ColorRingThumbProps>(), { as: "span" });

const rootContext = injectColorRingRootContext();
const { forwardRef, currentElement: thumbEl } = useForwardExpose();

onMounted(() => {
  if (thumbEl.value)
    rootContext.thumbElement.value = thumbEl.value;
});
onUnmounted(() => {
  if (rootContext.thumbElement.value === thumbEl.value)
    rootContext.thumbElement.value = undefined;
});

const angleDeg = computed(() => {
  const range = rootContext.max.value - rootContext.min.value;
  if (range === 0) return rootContext.startAngle.value;
  const normalized = (rootContext.currentValue.value - rootContext.min.value) / range;
  return normalized * 360 + rootContext.startAngle.value;
});

const label = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.channelKey.value));
const ariaValueText = computed(() => formatChannelValue(rootContext.colorSpace.value, rootContext.channelKey.value, rootContext.currentValue.value));
</script>

<template>
  <Primitive
    :ref="forwardRef"
    role="slider"
    :tabindex="rootContext.disabled.value ? undefined : 0"
    :aria-label="($attrs['aria-label'] as string) || label"
    :aria-valuenow="rootContext.currentValue.value"
    :aria-valuemin="rootContext.min.value"
    :aria-valuemax="rootContext.max.value"
    :aria-valuetext="ariaValueText"
    :aria-disabled="rootContext.disabled.value || undefined"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :as-child="asChild"
    :as="as"
    :style="{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `rotate(${angleDeg}deg) translateY(-${(1 + rootContext.innerRadius.value) / 2 * 50}cqmin) translate(-50%, -50%)`,
      transformOrigin: '0 0',
    }"
  >
    <slot />
  </Primitive>
</template>
