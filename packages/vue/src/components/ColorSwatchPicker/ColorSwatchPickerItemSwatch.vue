<script lang="ts">
import type { ColorSwatchRootProps } from "../ColorSwatch/ColorSwatchRoot.vue";

export interface ColorSwatchPickerItemSwatchProps extends Omit<ColorSwatchRootProps, "modelValue"> {}
</script>

<script setup lang="ts">
import ColorSwatchRoot from "../ColorSwatch/ColorSwatchRoot.vue";
import { injectColorSwatchPickerItemContext } from "./ColorSwatchPickerItem.vue";

const props = withDefaults(defineProps<ColorSwatchPickerItemSwatchProps>(), {
  as: "div",
});

const itemContext = injectColorSwatchPickerItemContext();

defineSlots<{
  default?: (props: { color: string; alpha: number }) => any;
}>();
</script>

<template>
  <ColorSwatchRoot
    v-bind="props"
    :model-value="itemContext.color.value"
  >
    <template #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </ColorSwatchRoot>
</template>
