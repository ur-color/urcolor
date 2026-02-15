<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
export interface ColorAreaThumbYProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";
import { injectColorAreaThumbContext } from "./utils";

withDefaults(defineProps<ColorAreaThumbYProps>(), {
  as: "span",
});

const rootContext = injectColorAreaRootContext();
const thumbContext = injectColorAreaThumbContext();
const { forwardRef, currentElement: thumbElement } = useForwardExpose();

const value = computed(() => rootContext.modelValue?.value?.[thumbContext.index.value]);

onMounted(() => {
  if (thumbElement.value)
    rootContext.thumbYElements.value.push(thumbElement.value);
});
onUnmounted(() => {
  const i = rootContext.thumbYElements.value.findIndex(el => el === thumbElement.value);
  if (i >= 0)
    rootContext.thumbYElements.value.splice(i, 1);
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    role="slider"
    :tabindex="rootContext.disabled.value ? undefined : (rootContext.activeDirection.value === 'y' ? 0 : -1)"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    aria-orientation="vertical"
    :aria-valuenow="value ? value[1] : undefined"
    :aria-valuemin="rootContext.minY.value"
    :aria-valuemax="rootContext.maxY.value"
    :as-child="asChild"
    :as="as"
    :style="{
      position: 'absolute',
      display: 'block',
      width: '100%',
      height: '100%',
    }"
    @focus="() => {
      rootContext.valueIndexToChangeRef.value = thumbContext.index.value
      rootContext.activeDirection.value = 'y'
    }"
  >
    <slot />
  </Primitive>
</template>
