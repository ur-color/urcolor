<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, Primitive, useForwardExpose, useDirection, RovingFocusGroup } from "reka-ui";

export type SelectionType = "single" | "multiple";

export interface ColorSwatchGroupRootProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** Whether to allow single or multiple selection. */
  type?: SelectionType;
  /** The controlled selected value(s). Can be bound as `v-model`. */
  modelValue?: string[];
  /** The default selected value(s) when uncontrolled. */
  defaultValue?: string[];
  /** When `true`, prevents the user from interacting with the group. */
  disabled?: boolean;
  /** The orientation of the group for arrow key navigation. */
  orientation?: "horizontal" | "vertical";
  /** Whether keyboard navigation should loop around. */
  loop?: boolean;
  /** Whether to use roving focus for keyboard navigation. */
  rovingFocus?: boolean;
  /** The reading direction. */
  dir?: "ltr" | "rtl";
}

export type ColorSwatchGroupRootEmits = {
  "update:modelValue": [value: string[]];
};

export interface ColorSwatchGroupContext {
  modelValue: Ref<string[]>;
  type: Ref<SelectionType>;
  disabled: Ref<boolean>;
  rovingFocus: Ref<boolean>;
  changeModelValue: (value: string) => void;
}

export const [injectColorSwatchGroupContext, provideColorSwatchGroupContext]
  = createContext<ColorSwatchGroupContext>("ColorSwatchGroupRoot");
</script>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";

const props = withDefaults(defineProps<ColorSwatchGroupRootProps>(), {
  as: "div",
  type: "single",
  defaultValue: () => [],
  disabled: false,
  orientation: "horizontal",
  loop: true,
  rovingFocus: true,
});

const emits = defineEmits<ColorSwatchGroupRootEmits>();
const { disabled, dir: propDir } = toRefs(props);
const resolvedDir = useDirection(propDir);
const { forwardRef } = useForwardExpose();

const internalValue = ref<string[]>(props.modelValue ?? props.defaultValue);

watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined) internalValue.value = val;
  },
);

function changeModelValue(value: string) {
  let next: string[];
  if (props.type === "single") {
    next = internalValue.value.includes(value) ? [] : [value];
  } else {
    next = internalValue.value.includes(value)
      ? internalValue.value.filter(v => v !== value)
      : [...internalValue.value, value];
  }
  internalValue.value = next;
  emits("update:modelValue", next);
}

provideColorSwatchGroupContext({
  modelValue: internalValue,
  type: computed(() => props.type),
  disabled,
  rovingFocus: computed(() => props.rovingFocus),
  changeModelValue,
});
</script>

<template>
  <RovingFocusGroup
    v-if="rovingFocus"
    as-child
    :orientation="orientation"
    :dir="resolvedDir"
    :loop="loop"
  >
    <Primitive
      :ref="forwardRef"
      :as="as"
      :as-child="asChild"
      role="group"
      :dir="resolvedDir"
      :data-orientation="orientation"
    >
      <slot />
    </Primitive>
  </RovingFocusGroup>

  <Primitive
    v-else
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    role="group"
    :dir="resolvedDir"
    :data-orientation="orientation"
  >
    <slot />
  </Primitive>
</template>
