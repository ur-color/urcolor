<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
export interface ColorWheelThumbXProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorWheelRootContext } from "./ColorWheelRoot.vue";

withDefaults(defineProps<ColorWheelThumbXProps>(), {
  as: "span",
});

const rootContext = injectColorWheelRootContext();
const { forwardRef, currentElement: thumbElement } = useForwardExpose();

onMounted(() => {
  if (thumbElement.value)
    rootContext.thumbXElement.value = thumbElement.value;
});
onUnmounted(() => {
  if (rootContext.thumbXElement.value === thumbElement.value)
    rootContext.thumbXElement.value = undefined;
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    role="slider"
    :tabindex="rootContext.disabled.value ? undefined : (rootContext.activeDirection.value === 'x' ? 0 : -1)"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    aria-orientation="horizontal"
    aria-label="angle"
    :aria-valuenow="rootContext.currentAngleValue.value"
    :aria-valuemin="rootContext.angleMin.value"
    :aria-valuemax="rootContext.angleMax.value"
    :as-child="asChild"
    :as="as"
    :style="{
      position: 'absolute',
      display: 'block',
      width: '100%',
      height: '100%',
    }"
    @focus="() => {
      rootContext.activeDirection.value = 'x'
    }"
  >
    <slot />
  </Primitive>
</template>
