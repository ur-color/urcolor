<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorFieldDecrementProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorFieldRootContext } from "./ColorFieldRoot.vue";
import { usePressedHold } from "./utils";

const props = withDefaults(defineProps<ColorFieldDecrementProps>(), {
  as: "button",
  disabled: false,
});

const rootContext = injectColorFieldRootContext();
useForwardExpose();

const isDisabled = computed(() =>
  rootContext.disabled.value
  || rootContext.readOnly.value
  || props.disabled
  || rootContext.isDecreaseDisabled.value,
);

const { isPressed, onPointerDown } = usePressedHold({
  disabled: isDisabled,
  onTrigger: () => rootContext.handleDecrease(),
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    tabindex="-1"
    aria-label="Decrease"
    :disabled="isDisabled || undefined"
    :data-pressed="isPressed ? '' : undefined"
    :data-disabled="isDisabled ? '' : undefined"
    @pointerdown="onPointerDown"
    @contextmenu.prevent
  >
    <slot />
  </Primitive>
</template>
