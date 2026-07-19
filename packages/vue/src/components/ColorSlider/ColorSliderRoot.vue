<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, SliderRoot, useForwardExpose, VisuallyHidden } from "reka-ui";
import { Color, type SpaceId } from "@urcolor/core";

export interface ColorSliderRootProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** The controlled color value. Can be bind as `v-model`. */
  modelValue?: Color | string | null;
  /** The default color value when uncontrolled. */
  defaultValue?: Color | string;
  /** The color space mode (e.g. 'hsl', 'oklch'). */
  colorSpace?: SpaceId;
  /** Which channel this slider controls (e.g. 'h', 's', 'l'). */
  channel?: string;
  /** When `true`, prevents the user from interacting with the slider. */
  disabled?: boolean;
  /** The reading direction. */
  dir?: "ltr" | "rtl";
  /** Whether the slider is visually inverted. */
  inverted?: boolean;
  /** The orientation of the slider. */
  orientation?: "horizontal" | "vertical";
  /** The stepping interval. When omitted, derives from the channel config. */
  step?: number;
  /** The name of the hidden input field for form submission. */
  name?: string;
  /** Whether the field is required for form submission. */
  required?: boolean;
}

export type ColorSliderRootEmits = {
  /** Event handler called when the color value changes */
  "update:modelValue": [payload: Color | undefined];
  /** Event handler called when the color value changes. Mirrors `update:modelValue`; present for API parity. */
  "update:color": [payload: Color];
  /** Event handler called on every value change, including mid-drag. */
  "change": [payload: Color];
  /** Event handler called when the value changes at the end of an interaction. */
  "changeEnd": [payload: Color];
};

export interface ColorSliderRootContext {
  colorRef: Ref<Color | undefined>;
  channel: Ref<string>;
  colorSpace: Ref<SpaceId>;
  orientation: Ref<"horizontal" | "vertical">;
  inverted: Ref<boolean>;
  disabled: Ref<boolean>;
  min: Ref<number>;
  max: Ref<number>;
  step: Ref<number>;
  channelValue: Ref<number>;
  isDragging: Ref<boolean>;
}

export const [injectColorSliderRootContext, provideColorSliderRootContext]
  = createContext<ColorSliderRootContext>("ColorSliderRoot");
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toRef, watch } from "vue";

import { getChannelConfig, displayToNative, nativeToDisplay } from "@urcolor/core";
import { useFormControl } from "../../shared/utils";

const props = withDefaults(defineProps<ColorSliderRootProps>(), {
  as: "span",
  colorSpace: "hsl",
  channel: "h",
  disabled: false,
  defaultValue: "hsl(0, 100%, 50%)",
});
const emit = defineEmits<ColorSliderRootEmits>();

const { forwardRef, currentElement } = useForwardExpose();
const isFormControl = useFormControl(currentElement);

defineSlots<{
  default?: (props: {
    /** Current color value */
    modelValue: Color | undefined;
  }) => any;
}>();

function parseColor(v: Color | string | null | undefined): Color | undefined {
  if (!v) return undefined;
  if (v instanceof Color) return v;
  return Color.parse(v) ?? undefined;
}

const colorRef = shallowRef<Color | undefined>(parseColor(props.modelValue ?? props.defaultValue));

watch(() => props.modelValue, (val) => {
  const parsed = parseColor(val);
  if (parsed) colorRef.value = parsed;
});

const isAlpha = computed(() => props.channel === "alpha");

const alphaConfig = { key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage" as const, nativeMin: 0, nativeMax: 1 };
const channelConfig = computed(() => isAlpha.value ? alphaConfig : getChannelConfig(props.colorSpace, props.channel));

const min = computed(() => channelConfig.value?.min ?? 0);
const max = computed(() => channelConfig.value?.max ?? 100);
const step = computed(() => props.step ?? channelConfig.value?.step ?? 1);

// Extract display value from Color for the internal slider
const internalValue = computed<number[]>({
  get() {
    if (!colorRef.value || !channelConfig.value) return [channelConfig.value?.min ?? 0];
    if (isAlpha.value) {
      return [Math.round(colorRef.value.alpha * 100)];
    }
    const converted = colorRef.value.to(props.colorSpace);
    const raw = converted.get(props.channel);
    return [nativeToDisplay(channelConfig.value, raw)];
  },
  set(val: number[]) {
    if (!colorRef.value || !channelConfig.value || val[0] === undefined) return;
    let newColor: Color | undefined;
    if (isAlpha.value) {
      newColor = colorRef.value.withAlpha(val[0] / 100);
    } else {
      const nativeVal = displayToNative(channelConfig.value, val[0]);
      newColor = colorRef.value.with({
        space: props.colorSpace,
        [props.channel]: nativeVal,
      });
    }
    if (newColor) {
      colorRef.value = newColor;
      emit("update:modelValue", newColor);
      emit("update:color", newColor);
      emit("change", newColor);
    }
  },
});

function handleValueCommit() {
  if (colorRef.value) {
    emit("changeEnd", colorRef.value);
  }
}

const orientationRef = computed(() => props.orientation ?? "horizontal");
const invertedRef = computed(() => props.inverted ?? false);
const isDragging = ref(false);
const channelValue = computed(() => internalValue.value[0] ?? min.value);

provideColorSliderRootContext({
  colorRef,
  channel: toRef(props, "channel"),
  colorSpace: toRef(props, "colorSpace"),
  orientation: orientationRef,
  inverted: invertedRef,
  disabled: toRef(props, "disabled"),
  min,
  max,
  step,
  channelValue,
  isDragging,
});
</script>

<template>
  <SliderRoot
    :ref="forwardRef"
    v-model="internalValue"
    :as="as"
    :as-child="asChild"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :dir="dir"
    :inverted="inverted"
    :orientation="orientation"
    @value-commit="handleValueCommit"
    @pointerdown="isDragging = true"
    @pointerup="isDragging = false"
  >
    <slot :model-value="colorRef" />

    <VisuallyHidden
      v-if="isFormControl && name"
      as="input"
      type="hidden"
      :value="colorRef?.toString() ?? ''"
      :name="name"
      :required="required"
      :disabled="disabled"
    />
  </SliderRoot>
</template>
