<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
import { useForwardExpose, Primitive } from "reka-ui";

export interface ColorAreaTrackProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";

withDefaults(defineProps<ColorAreaTrackProps>(), { as: "span" });

const rootContext = injectColorAreaRootContext();

useForwardExpose();
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
