<script lang="ts">
import type { ColorSwatchRootProps } from "../ColorSwatch/ColorSwatchRoot.vue";
import type { PrimitiveProps } from "reka-ui";

export interface ColorSwatchGroupItemProps
  extends /* @vue-ignore */ PrimitiveProps,
    Pick<ColorSwatchRootProps, "checkerSize" | "alpha"> {
  as?: string;
  asChild?: boolean;
  /** The color value. Serves as both the selection value and the displayed color. */
  value: string;
  /** When `true`, prevents the user from interacting with this item. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { RovingFocusItem, useForwardExpose } from "reka-ui";
import ColorSwatchRoot from "../ColorSwatch/ColorSwatchRoot.vue";
import { injectColorSwatchGroupContext } from "./ColorSwatchGroupRoot.vue";

const props = withDefaults(defineProps<ColorSwatchGroupItemProps>(), {
  as: "button",
  disabled: false,
});

const { forwardRef } = useForwardExpose();
const context = injectColorSwatchGroupContext();

const isDisabled = computed(() => props.disabled || context.disabled.value);
const isPressed = computed(() => context.modelValue.value.includes(props.value));
const dataState = computed(() => (isPressed.value ? "on" : "off"));

const role = computed(() => (context.type.value === "single" ? "radio" : "checkbox"));
const ariaChecked = computed(() => isPressed.value);

function handleClick() {
  if (isDisabled.value) return;
  context.changeModelValue(props.value);
}
</script>

<template>
  <RovingFocusItem v-if="context.rovingFocus.value" as-child :focusable="!isDisabled">
    <ColorSwatchRoot
      :ref="forwardRef"
      :as="as"
      :as-child="asChild"
      :model-value="value"
      :checker-size="checkerSize"
      :alpha="alpha"
      :role="role"
      :aria-checked="ariaChecked"
      :aria-pressed="isPressed"
      :aria-disabled="isDisabled || undefined"
      :data-state="dataState"
      :data-disabled="isDisabled ? '' : undefined"
      :tabindex="isDisabled ? -1 : undefined"
      @click="handleClick"
      @keydown.enter.prevent="handleClick"
      @keydown.space.prevent="handleClick"
    >
      <slot />
    </ColorSwatchRoot>
  </RovingFocusItem>

  <ColorSwatchRoot
    v-else
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    :model-value="value"
    :checker-size="checkerSize"
    :alpha="alpha"
    :role="role"
    :aria-checked="ariaChecked"
    :aria-pressed="isPressed"
    :aria-disabled="isDisabled || undefined"
    :data-state="dataState"
    :data-disabled="isDisabled ? '' : undefined"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <slot />
  </ColorSwatchRoot>
</template>
