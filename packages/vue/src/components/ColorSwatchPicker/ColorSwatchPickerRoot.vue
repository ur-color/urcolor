<script lang="ts">
import type { ListboxRootEmits, ListboxRootProps } from "../../primitives/types";

export interface ColorSwatchPickerRootProps extends /* @vue-ignore */ Omit<ListboxRootProps, "by"> {
  as?: string;
  asChild?: boolean;
  /** The selected colour, or colours when `multiple` is set. Can be bound with `v-model`. */
  modelValue?: string | string[];
  /** The initially selected colour(s) when uncontrolled. */
  defaultValue?: string | string[];
  /** Allow selecting more than one swatch. */
  multiple?: boolean;
  /** When `true`, prevents the user from interacting with any swatch. */
  disabled?: boolean;
  /** The orientation of the picker, which decides the arrow keys used to navigate it. */
  orientation?: "horizontal" | "vertical";
  /** The reading direction. */
  dir?: "ltr" | "rtl";
  /** How selecting an already-selected swatch behaves when `multiple` is set. */
  selectionBehavior?: "toggle" | "replace";
  /** When `true`, hovering a swatch highlights it. */
  highlightOnHover?: boolean;
  /** The name submitted with a parent form. */
  name?: string;
  /** When `true`, the field is required in a parent form. */
  required?: boolean;
}

export type ColorSwatchPickerRootEmits = ListboxRootEmits;
</script>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ListboxContent, ListboxRoot, useForwardExpose } from "reka-ui";

// `dir` is deliberately left out of these defaults (unlike the reka brief's
// `dir: "ltr"`): leaving it `undefined` lets `ListboxRoot` fall through to
// reka's `ConfigProvider` for direction instead of hard-forcing LTR. Do not
// "restore" a default here without re-checking that trade-off.
const props = withDefaults(defineProps<ColorSwatchPickerRootProps>(), {
  as: "div",
  multiple: false,
  disabled: false,
  orientation: "horizontal",
  selectionBehavior: "toggle",
  highlightOnHover: false,
});

const emits = defineEmits<ColorSwatchPickerRootEmits>();

useForwardExpose();

// Controlled-ness is fixed at setup, matching `useVModel`'s `passive` contract:
// when the consumer supplies `modelValue` we never hold state of our own — reads
// come straight from the prop and writes only emit. Otherwise we own the state
// and seed it from `defaultValue`.
const isControlled = props.modelValue !== undefined;
const internalValue = ref<string | string[] | undefined>(
  props.defaultValue ?? (props.multiple ? [] : undefined),
);

const modelValue = computed<string | string[] | undefined>({
  get: () => (isControlled ? props.modelValue : internalValue.value),
  set: (value) => {
    if (!isControlled) internalValue.value = value;
    emits("update:modelValue", value as never);
  },
});

defineSlots<{
  default?: (props: { modelValue: string | string[] | undefined }) => any;
}>();

const listboxProps = computed(() => ({
  multiple: props.multiple,
  disabled: props.disabled,
  orientation: props.orientation,
  dir: props.dir,
  selectionBehavior: props.selectionBehavior,
  highlightOnHover: props.highlightOnHover,
  name: props.name,
  required: props.required,
}));
</script>

<template>
  <!--
    `ColorSwatchPickerRootEmits` is `ListboxRootEmits`, which declares four
    events: `update:modelValue`, `highlight`, `entryFocus`, `leave`. Once
    `defineEmits` registers all four, Vue strips them out of `$attrs`, so a
    plain `v-bind="listboxProps"` (which carries no listeners) plus
    `v-model` is not enough — a consumer's `@highlight` etc. would be
    silently swallowed instead of reaching `ListboxRoot`.

    We forward `highlight` / `entryFocus` / `leave` explicitly rather than
    via reka's `useForwardPropsEmits` + `useEmitAsProps`: those forward
    every declared emit generically, including `update:modelValue`, which
    would double-fire it alongside the `v-model` binding above (once from
    reka's auto-generated `onUpdate:modelValue` prop, once from `v-model`
    itself) and bypass the controlled/uncontrolled logic in the
    `modelValue` computed setter. Explicit bindings keep that setter as the
    single source of truth for `update:modelValue` while still letting the
    other three pass through untouched.
  -->
  <ListboxRoot
    v-bind="listboxProps"
    v-model="modelValue"
    as-child
    @highlight="emits('highlight', $event)"
    @entry-focus="emits('entryFocus', $event)"
    @leave="emits('leave', $event)"
  >
    <ListboxContent
      :as="as"
      :as-child="asChild"
    >
      <slot :model-value="modelValue" />
    </ListboxContent>
  </ListboxRoot>
</template>
