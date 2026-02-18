<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
export interface ColorTriangleThumbYProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorTriangleRootContext } from "./ColorTriangleRoot.vue";

withDefaults(defineProps<ColorTriangleThumbYProps>(), {
  as: "span",
});

const rootContext = injectColorTriangleRootContext();
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
    :tabindex="rootContext.disabled.value ? undefined : (rootContext.isThreeChannel.value ? 0 : (rootContext.activeDirection.value === 'y' ? 0 : -1))"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    aria-orientation="vertical"
    :aria-label="rootContext.yChannelKey.value"
    :aria-valuenow="rootContext.currentYValue.value"
    :aria-valuemin="rootContext.yMin.value"
    :aria-valuemax="rootContext.yMax.value"
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
