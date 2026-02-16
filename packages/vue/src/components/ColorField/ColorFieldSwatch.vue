<script lang="ts">
import type { ColorSwatchRootProps } from "../ColorSwatch/ColorSwatchRoot.vue";

export interface ColorFieldSwatchProps extends /* @vue-ignore */ ColorSwatchRootProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from "reka-ui";
import ColorSwatchRoot from "../ColorSwatch/ColorSwatchRoot.vue";

const _props = withDefaults(defineProps<ColorFieldSwatchProps>(), {
  as: "span",
});

useForwardExpose();
</script>

<template>
  <ColorSwatchRoot
    :as="as"
    :as-child="asChild"
    :model-value="modelValue"
    :checker-size="checkerSize"
    :alpha="alpha"
  >
    <slot />
  </ColorSwatchRoot>
</template>
