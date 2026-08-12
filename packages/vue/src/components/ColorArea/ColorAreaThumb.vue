<script lang="ts">
import type { PrimitiveProps } from "../../primitives/types";
export interface ColorAreaThumbProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { useMounted } from "@vueuse/core";
import { computed, onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";
import { convertValueToPercentage, getThumbInBoundsOffset, useCollection, useSize } from "../../shared/utils";
import { channelLabel, formatChannelValue } from "../../shared/channel-labels";
defineOptions({
  inheritAttrs: false,
});

withDefaults(defineProps<ColorAreaThumbProps>(), {
  as: "span",
});

const rootContext = injectColorAreaRootContext();
const { forwardRef, currentElement: thumbElement } = useForwardExpose();
const { CollectionItem, getItems } = useCollection();

const index = computed(() => thumbElement.value ? getItems(true).findIndex(i => i.ref === thumbElement.value) : -1);

const value = computed(() => rootContext.modelValue?.value?.[index.value]);
const percentX = computed(() => value.value === undefined ? 0 : convertValueToPercentage(value.value[0] ?? 0, rootContext.minX.value ?? 0, rootContext.maxX.value ?? 100));
const percentY = computed(() => value.value === undefined ? 0 : convertValueToPercentage(value.value[1] ?? 0, rootContext.minY.value ?? 0, rootContext.maxY.value ?? 100));

const xLabel = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.xChannelKey.value));
const yLabel = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.yChannelKey.value));
const ariaLabel = computed(() => `${xLabel.value}, ${yLabel.value}`);
const ariaValueText = computed(() => {
  const v = value.value;
  if (!v)
    return undefined;
  const space = rootContext.colorSpace.value;
  const x = formatChannelValue(space, rootContext.xChannelKey.value, v[0] ?? 0);
  const y = formatChannelValue(space, rootContext.yChannelKey.value, v[1] ?? 0);
  return `${xLabel.value} ${x}, ${yLabel.value} ${y}`;
});

const size = useSize(thumbElement);
const thumbInBoundsOffsetX = computed(() => {
  if (rootContext.thumbAlignment.value === "overflow" || !size.width.value)
    return 0;
  return getThumbInBoundsOffset(size.width.value, percentX.value, rootContext.isSlidingFromLeft.value ? 1 : -1);
});
const thumbInBoundsOffsetY = computed(() => {
  if (rootContext.thumbAlignment.value === "overflow" || !size.height.value)
    return 0;
  return getThumbInBoundsOffset(size.height.value, percentY.value, rootContext.isSlidingFromTop.value ? 1 : -1);
});

const isMounted = useMounted();

onMounted(() => {
  if (thumbElement.value)
    rootContext.thumbRef.value = thumbElement.value;
});
onUnmounted(() => {
  if (rootContext.thumbRef.value === thumbElement.value)
    rootContext.thumbRef.value = undefined;
});
</script>

<template>
  <CollectionItem>
    <Primitive
      v-bind="$attrs"
      :ref="forwardRef"
      role="slider"
      :tabindex="rootContext.disabled.value ? undefined : 0"
      :aria-label="($attrs['aria-label'] as string) || ariaLabel"
      :aria-valuenow="value ? value[0] : undefined"
      :aria-valuemin="rootContext.minX.value"
      :aria-valuemax="rootContext.maxX.value"
      :aria-valuetext="ariaValueText"
      :data-disabled="rootContext.disabled.value ? '' : undefined"
      aria-roledescription="Color thumb"
      :as-child="asChild"
      :as="as"
      :style="{
        transform: 'var(--reka-slider-area-thumb-transform)',
        position: 'absolute',
        [rootContext.isSlidingFromLeft.value ? 'left' : 'right']: `calc(${percentX}% + ${thumbInBoundsOffsetX}px)`,
        [rootContext.isSlidingFromTop.value ? 'top' : 'bottom']: `calc(${percentY}% + ${thumbInBoundsOffsetY}px)`,
        display: !isMounted && value === undefined ? 'none' : undefined,
      }"
      @focus="() => {
        rootContext.valueIndexToChangeRef.value = index
      }"
    >
      <slot />
    </Primitive>
  </CollectionItem>
</template>
