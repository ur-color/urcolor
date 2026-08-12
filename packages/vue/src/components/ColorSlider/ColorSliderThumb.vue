<script lang="ts">
import type { SliderThumbProps } from "../../primitives/types";

export interface ColorSliderThumbProps extends /* @vue-ignore */ SliderThumbProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { SliderThumb } from "reka-ui";
import { channelLabel, formatChannelValue } from "../../shared/channel-labels";
import { injectColorSliderRootContext } from "./ColorSliderRoot.vue";

withDefaults(defineProps<ColorSliderThumbProps>(), { as: "span" });

const rootContext = injectColorSliderRootContext();

const channelName = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.channel.value));
const channelValue = computed(() => rootContext.channelValue.value);
const ariaValueText = computed(() => formatChannelValue(rootContext.colorSpace.value, rootContext.channel.value, channelValue.value));

defineSlots<{
  default?: (props: { channelName: string; channelValue: number }) => any;
}>();
</script>

<template>
  <SliderThumb
    :as="as"
    :as-child="asChild"
    :aria-label="($attrs['aria-label'] as string) || channelName"
    :aria-valuetext="ariaValueText"
  >
    <slot
      :channel-name="channelName"
      :channel-value="channelValue"
    />
  </SliderThumb>
</template>
