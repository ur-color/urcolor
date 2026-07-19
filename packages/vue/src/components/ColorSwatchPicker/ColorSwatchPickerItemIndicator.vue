<script lang="ts">
import type { ListboxItemIndicatorProps } from "reka-ui";

export interface ColorSwatchPickerItemIndicatorProps extends /* @vue-ignore */ ListboxItemIndicatorProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { ListboxItemIndicator } from "reka-ui";

const props = withDefaults(defineProps<ColorSwatchPickerItemIndicatorProps>(), {
  as: "span",
});
</script>

<template>
  <ListboxItemIndicator v-bind="props">
    <slot />
  </ListboxItemIndicator>
</template>
