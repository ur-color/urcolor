<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
export interface ColorTriangleThumbXProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorTriangleRootContext } from "./ColorTriangleRoot.vue";

withDefaults(defineProps<ColorTriangleThumbXProps>(), {
  as: "span",
});

const rootContext = injectColorTriangleRootContext();
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
    :tabindex="rootContext.disabled.value ? undefined : (rootContext.isThreeChannel.value ? 0 : (rootContext.activeDirection.value === 'x' ? 0 : -1))"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    aria-orientation="horizontal"
    :aria-label="rootContext.xChannelKey.value"
    :aria-valuenow="rootContext.currentXValue.value"
    :aria-valuemin="rootContext.xMin.value"
    :aria-valuemax="rootContext.xMax.value"
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
