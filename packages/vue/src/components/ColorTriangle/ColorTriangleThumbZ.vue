<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
export interface ColorTriangleThumbZProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorTriangleRootContext } from "./ColorTriangleRoot.vue";

withDefaults(defineProps<ColorTriangleThumbZProps>(), {
  as: "span",
});

const rootContext = injectColorTriangleRootContext();
const { forwardRef, currentElement: thumbElement } = useForwardExpose();

onMounted(() => {
  if (thumbElement.value)
    rootContext.thumbZElement.value = thumbElement.value;
});
onUnmounted(() => {
  if (rootContext.thumbZElement.value === thumbElement.value)
    rootContext.thumbZElement.value = undefined;
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    role="slider"
    :tabindex="rootContext.disabled.value ? undefined : (rootContext.isThreeChannel.value ? 0 : (rootContext.activeDirection.value === 'z' ? 0 : -1))"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    aria-orientation="horizontal"
    :aria-label="rootContext.zChannelKey.value"
    :aria-valuenow="rootContext.currentZValue.value"
    :aria-valuemin="rootContext.zMin.value"
    :aria-valuemax="rootContext.zMax.value"
    :as-child="asChild"
    :as="as"
    :style="{
      position: 'absolute',
      display: 'block',
      width: '100%',
      height: '100%',
    }"
    @focus="() => {
      rootContext.activeDirection.value = 'z'
    }"
  >
    <slot />
  </Primitive>
</template>
