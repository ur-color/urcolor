<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
export interface ColorWheelThumbYProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorWheelRootContext } from "./ColorWheelRoot.vue";

withDefaults(defineProps<ColorWheelThumbYProps>(), {
  as: "span",
});

const rootContext = injectColorWheelRootContext();
const { forwardRef, currentElement: thumbElement } = useForwardExpose();

onMounted(() => {
  if (thumbElement.value)
    rootContext.thumbYElement.value = thumbElement.value;
});
onUnmounted(() => {
  if (rootContext.thumbYElement.value === thumbElement.value)
    rootContext.thumbYElement.value = undefined;
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    role="slider"
    :tabindex="rootContext.disabled.value ? undefined : (rootContext.activeDirection.value === 'y' ? 0 : -1)"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    aria-orientation="vertical"
    aria-label="radius"
    :aria-valuenow="rootContext.currentRadiusValue.value"
    :aria-valuemin="rootContext.radiusMin.value"
    :aria-valuemax="rootContext.radiusMax.value"
    :as-child="asChild"
    :as="as"
    :style="{
      position: 'absolute',
      display: 'block',
      width: '100%',
      height: '100%',
    }"
    @focus="() => {
      rootContext.activeDirection.value = 'y'
    }"
  >
    <slot />
  </Primitive>
</template>
