<script lang="ts">
import type { Ref, Ref as VueRef } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, Primitive, useForwardExpose, VisuallyHidden } from "reka-ui";
import "internationalized-color/css";
import { Color } from "internationalized-color";

export interface ColorFieldRootProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** The controlled color value. v-model binding. */
  modelValue?: Color | string | null;
  /** The color space mode (e.g. 'hsl', 'oklch'). */
  colorSpace?: string;
  /** Which channel this field controls (e.g. 'h', 's', 'l'). */
  channel?: string;
  /** Channel display format. Auto-derived from colorSpace config if not set. */
  format?: "number" | "degree" | "percentage" | "hex";
  /** Minimum allowed value. Auto-derived from colorSpace config if not set. */
  min?: number;
  /** Maximum allowed value. Auto-derived from colorSpace config if not set. */
  max?: number;
  /** Step increment for arrow keys. Auto-derived from colorSpace config if not set. */
  step?: number;
  /** Whether the field is disabled. */
  disabled?: boolean;
  /** Whether the field is read-only. */
  readOnly?: boolean;
  /** Hidden input name for form submission. */
  name?: string;
  /** Whether required for form submission. */
  required?: boolean;
}

export type ColorFieldRootEmits = {
  "update:modelValue": [value: Color | undefined];
  "valueCommit": [value: Color];
};

export interface ColorFieldRootContext {
  modelValue: Ref<number | undefined>;
  displayValue: Ref<string>;
  disabled: Ref<boolean>;
  readOnly: Ref<boolean>;
  isDecreaseDisabled: Ref<boolean>;
  isIncreaseDisabled: Ref<boolean>;
  handleIncrease: (multiplier?: number) => void;
  handleDecrease: (multiplier?: number) => void;
  handleMinMaxValue: (type: "min" | "max") => void;
  commitValue: (val: number | undefined) => void;
  onInputChange: (text: string) => void;
  inputEl: Ref<HTMLInputElement | undefined>;
  onInputElement: (el: HTMLInputElement) => void;
  format: Ref<"number" | "degree" | "percentage" | "hex">;
}

export const [injectColorFieldRootContext, provideColorFieldRootContext]
  = createContext<ColorFieldRootContext>("ColorFieldRoot");
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toRefs, watch } from "vue";
import { getChannelConfig, displayToCulori, culoriToDisplay } from "@urcolor/core";
import { clamp, snapToStep, useFormControl } from "../ColorArea/utils";

const props = withDefaults(defineProps<ColorFieldRootProps>(), {
  as: "div",
  colorSpace: "hsl",
  channel: "h",
  disabled: false,
  readOnly: false,
  required: false,
});

const emit = defineEmits<ColorFieldRootEmits>();

const { disabled, readOnly } = toRefs(props);
const { forwardRef, currentElement } = useForwardExpose();
const isFormControl = useFormControl(currentElement);

function parseColor(v: Color | string | null | undefined): Color | undefined {
  if (!v) return undefined;
  if (v instanceof Color) return v;
  return Color.parse(v) ?? undefined;
}

const colorRef = shallowRef<Color | undefined>(parseColor(props.modelValue));

watch(() => props.modelValue, (val) => {
  const parsed = parseColor(val);
  if (parsed) colorRef.value = parsed;
});

const channelConfig = computed(() => getChannelConfig(props.colorSpace, props.channel));

// Resolve effective min/max/step/format from props or config
const effectiveMin = computed(() => props.min ?? channelConfig.value?.min ?? 0);
const effectiveMax = computed(() => props.max ?? channelConfig.value?.max ?? (isHexMode.value ? 0xFFFFFF : 100));
const effectiveStep = computed(() => props.step ?? channelConfig.value?.step ?? 1);
const effectiveFormat = computed<"number" | "degree" | "percentage" | "hex">(() => {
  return props.format ?? channelConfig.value?.format ?? "number";
});

const isHexMode = computed(() => effectiveFormat.value === "hex");

// Extract display value from Color
function getDisplayValue(): number | undefined {
  if (!colorRef.value) return undefined;
  if (isHexMode.value) {
    // Convert color to integer: 0xRRGGBB
    const hex = colorRef.value.toHex().replace(/^#/, "");
    return Number.parseInt(hex.slice(0, 6), 16);
  }
  if (!channelConfig.value) return undefined;
  const converted = colorRef.value.to(props.colorSpace);
  if (!converted) return undefined;
  const raw = converted.get(props.channel, 0);
  return culoriToDisplay(channelConfig.value, raw);
}

const numericValue = ref<number | undefined>(getDisplayValue());

watch(colorRef, () => {
  const v = getDisplayValue();
  if (v !== undefined && Math.abs((v ?? 0) - (numericValue.value ?? 0)) > 0.001) {
    numericValue.value = v;
  }
});

// Rebuild Color from numeric display value
function rebuildColor(displayVal: number): Color | undefined {
  if (!colorRef.value) return undefined;
  if (isHexMode.value) {
    const hexStr = `#${Math.round(clamp(displayVal, 0, 0xFFFFFF)).toString(16).padStart(6, "0")}`;
    return Color.parse(hexStr) ?? undefined;
  }
  if (!channelConfig.value) return undefined;
  const culoriVal = displayToCulori(channelConfig.value, displayVal);
  return colorRef.value.set({
    mode: props.colorSpace,
    [props.channel]: culoriVal,
  });
}

const inputEl = ref<HTMLInputElement>();

function formatValue(val: number | undefined): string {
  if (val === undefined) return "";
  switch (effectiveFormat.value) {
    case "degree":
      return `${val}deg`;
    case "percentage":
      return `${val}%`;
    case "hex":
      return `#${Math.round(val).toString(16).padStart(6, "0")}`;
    default:
      return String(val);
  }
}

function parseValue(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  switch (effectiveFormat.value) {
    case "degree":
      return Number.parseFloat(trimmed.replace(/deg$/i, ""));
    case "percentage":
      return Number.parseFloat(trimmed.replace(/%$/, ""));
    case "hex": {
      const hex = trimmed.replace(/^#/, "");
      if (!/^[0-9a-f]*$/i.test(hex)) return undefined;
      return Number.parseInt(hex, 16);
    }
    default:
      return Number.parseFloat(trimmed);
  }
}

function clampValue(val: number): number {
  let clamped = clamp(val, effectiveMin.value, effectiveMax.value);
  clamped = snapToStep(clamped, effectiveMin.value, effectiveMax.value, effectiveStep.value);
  return clamped;
}

const displayValue = ref(formatValue(numericValue.value));

watch(numericValue, (val) => {
  displayValue.value = formatValue(val);
});

function emitColor(val: number) {
  const newColor = rebuildColor(val);
  if (newColor) {
    colorRef.value = newColor;
    emit("update:modelValue", newColor);
  }
  return newColor;
}

function commitValue(val: number | undefined) {
  if (val === undefined || Number.isNaN(val)) {
    numericValue.value = undefined;
    displayValue.value = "";
    return;
  }
  const clamped = isHexMode.value ? clamp(Math.round(val), effectiveMin.value, effectiveMax.value) : clampValue(val);
  numericValue.value = clamped;
  displayValue.value = formatValue(clamped);
  const newColor = emitColor(clamped);
  if (newColor) emit("valueCommit", newColor);
}

function onInputChange(text: string) {
  displayValue.value = text;
  const parsed = parseValue(text);
  if (parsed !== undefined && !Number.isNaN(parsed)) {
    numericValue.value = parsed;
    emitColor(parsed);
  }
}

function handleIncrease(multiplier = 1) {
  if (props.disabled || props.readOnly) return;
  const current = numericValue.value ?? 0;
  const next = clampValue(current + effectiveStep.value * multiplier);
  numericValue.value = next;
  displayValue.value = formatValue(next);
  const newColor = emitColor(next);
  if (newColor) emit("valueCommit", newColor);
}

function handleDecrease(multiplier = 1) {
  if (props.disabled || props.readOnly) return;
  const current = numericValue.value ?? 0;
  const next = clampValue(current - effectiveStep.value * multiplier);
  numericValue.value = next;
  displayValue.value = formatValue(next);
  const newColor = emitColor(next);
  if (newColor) emit("valueCommit", newColor);
}

function handleMinMaxValue(type: "min" | "max") {
  if (props.disabled || props.readOnly) return;
  const val = type === "min" ? effectiveMin.value : effectiveMax.value;
  numericValue.value = val;
  displayValue.value = formatValue(val);
  const newColor = emitColor(val);
  if (newColor) emit("valueCommit", newColor);
}

const isDecreaseDisabled = computed(() => {
  if (numericValue.value === undefined) return false;
  return clampValue(numericValue.value) <= effectiveMin.value;
});

const isIncreaseDisabled = computed(() => {
  if (numericValue.value === undefined) return false;
  return clampValue(numericValue.value) >= effectiveMax.value;
});

function onInputElement(el: HTMLInputElement) {
  inputEl.value = el;
}

provideColorFieldRootContext({
  modelValue: numericValue,
  displayValue,
  disabled,
  readOnly,
  isDecreaseDisabled,
  isIncreaseDisabled,
  handleIncrease,
  handleDecrease,
  handleMinMaxValue,
  commitValue,
  onInputChange,
  inputEl,
  onInputElement,
  format: effectiveFormat,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    :dir="undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readOnly ? '' : undefined"
  >
    <slot />

    <VisuallyHidden
      v-if="isFormControl && name"
      as="input"
      type="hidden"
      :value="numericValue !== undefined ? numericValue : ''"
      :name="name"
      :required="required"
      :disabled="disabled"
    />
  </Primitive>
</template>
