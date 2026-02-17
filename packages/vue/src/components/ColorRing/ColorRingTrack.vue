<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorRingTrackProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorRingRootContext } from "./ColorRingRoot.vue";

withDefaults(defineProps<ColorRingTrackProps>(), { as: "div" });

useForwardExpose();
const rootContext = injectColorRingRootContext();
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
  >
    <slot />
  </Primitive>
</template>
