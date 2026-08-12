<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "../../primitives/types";
import { createContext, Primitive, useForwardExpose, VisuallyHidden } from "reka-ui";
import { Color, type SpaceId } from "@urcolor/core";

export interface ColorFieldRootProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** The controlled color value. v-model binding. */
  modelValue?: Color | string | null;
  /** The color space mode (e.g. 'hsl', 'oklch'). */
  colorSpace?: SpaceId;
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
  readonly?: boolean;
  /** Hidden input name for form submission. */
  name?: string;
  /** Whether required for form submission. */
  required?: boolean;
  /** Placeholder text shown in the input when it has no value. */
  placeholder?: string;
  /** When `true`, disables stepping the value via the mouse wheel. */
  disableWheelChange?: boolean;
  /** The locale used for parsing/formatting. Reserved for future use. */
  locale?: string;
  /** The default color value when uncontrolled. */
  defaultValue?: Color | string;
}

export type ColorFieldRootEmits = {
  /** Event handler called when the color value changes */
  "update:modelValue": [value: Color | undefined];
  /** Event handler called when the color value changes. Mirrors `update:modelValue`; present for API parity. */
  "update:color": [value: Color];
  /** Event handler called on every value change, including mid-typing. */
  "change": [value: Color];
  /** Event handler called when the value changes at the end of an interaction (blur, Enter, arrow keys, wheel, or increment/decrement). */
  "changeEnd": [value: Color];
};

export interface ColorFieldRootContext {
  modelValue: Ref<number | undefined>;
  displayValue: Ref<string>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  isDecreaseDisabled: Ref<boolean>;
  isIncreaseDisabled: Ref<boolean>;
  handleIncrease: (multiplier?: number) => void;
  handleDecrease: (multiplier?: number) => void;
  handleMinMaxValue: (type: "min" | "max") => void;
  handleWheel: (event: WheelEvent) => void;
  commitValue: (val: number | undefined) => void;
  onInputChange: (text: string) => void;
  inputEl: Ref<HTMLInputElement | undefined>;
  onInputElement: (el: HTMLInputElement) => void;
  format: Ref<"number" | "degree" | "percentage" | "hex">;
  channel: Ref<string>;
  colorSpace: Ref<SpaceId>;
  min: Ref<number>;
  max: Ref<number>;
  placeholder: Ref<string | undefined>;
  disableWheelChange: Ref<boolean>;
  locale: Ref<string | undefined>;
}

export const [injectColorFieldRootContext, provideColorFieldRootContext]
  = createContext<ColorFieldRootContext>("ColorFieldRoot");
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toRef, toRefs, watch } from "vue";
import { getChannelConfig, displayToNative, nativeToDisplay, type ChannelConfig } from "@urcolor/shared";
import { clamp, snapToStep, useFormControl } from "../../shared/utils";

const props = withDefaults(defineProps<ColorFieldRootProps>(), {
  as: "div",
  colorSpace: "hsl",
  channel: "h",
  disabled: false,
  readonly: false,
  required: false,
  disableWheelChange: false,
  defaultValue: "hsl(0, 100%, 50%)",
});

const emit = defineEmits<ColorFieldRootEmits>();

const { disabled, readonly } = toRefs(props);
const { forwardRef, currentElement } = useForwardExpose();
const isFormControl = useFormControl(currentElement);

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
const alphaConfig: ChannelConfig = { key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 };
const channelConfig = computed(() => isAlpha.value ? alphaConfig : getChannelConfig(props.colorSpace, props.channel));

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
    const hex = colorRef.value.toString("hex").replace(/^#/, "");
    return Number.parseInt(hex.slice(0, 6), 16);
  }
  if (!channelConfig.value) return undefined;
  if (isAlpha.value) {
    return Math.round(colorRef.value.alpha * 100);
  }
  const converted = colorRef.value.to(props.colorSpace);
  const raw = converted.get(props.channel);
  return nativeToDisplay(channelConfig.value, raw);
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
  if (isAlpha.value) {
    return colorRef.value.withAlpha(displayVal / 100);
  }
  const nativeVal = displayToNative(channelConfig.value, displayVal);
  return colorRef.value.with({
    space: props.colorSpace,
    [props.channel]: nativeVal,
  });
}

const inputEl = ref<HTMLInputElement>();

function formatValue(val: number | undefined): string {
  if (val === undefined) return "";
  switch (effectiveFormat.value) {
    case "degree":
      return `${val}°`;
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
      return Number.parseFloat(trimmed.replace(/[°]$|deg$/i, ""));
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
    emit("update:color", newColor);
    emit("change", newColor);
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
  if (newColor) emit("changeEnd", newColor);
}

function onInputChange(text: string) {
  if (props.disabled || props.readonly) return;
  displayValue.value = text;
  const parsed = parseValue(text);
  if (parsed !== undefined && !Number.isNaN(parsed)) {
    numericValue.value = parsed;
    emitColor(parsed);
  }
}

function handleIncrease(multiplier = 1) {
  if (props.disabled || props.readonly) return;
  const current = numericValue.value ?? 0;
  const next = clampValue(current + effectiveStep.value * multiplier);
  numericValue.value = next;
  displayValue.value = formatValue(next);
  const newColor = emitColor(next);
  if (newColor) emit("changeEnd", newColor);
}

function handleDecrease(multiplier = 1) {
  if (props.disabled || props.readonly) return;
  const current = numericValue.value ?? 0;
  const next = clampValue(current - effectiveStep.value * multiplier);
  numericValue.value = next;
  displayValue.value = formatValue(next);
  const newColor = emitColor(next);
  if (newColor) emit("changeEnd", newColor);
}

function handleMinMaxValue(type: "min" | "max") {
  if (props.disabled || props.readonly) return;
  const val = type === "min" ? effectiveMin.value : effectiveMax.value;
  numericValue.value = val;
  displayValue.value = formatValue(val);
  const newColor = emitColor(val);
  if (newColor) emit("changeEnd", newColor);
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

function handleWheel(event: WheelEvent) {
  if (props.disableWheelChange || props.disabled || props.readonly)
    return;
  event.preventDefault();
  if (event.deltaY > 0)
    handleDecrease();
  else
    handleIncrease();
}

provideColorFieldRootContext({
  modelValue: numericValue,
  displayValue,
  disabled,
  readonly,
  isDecreaseDisabled,
  isIncreaseDisabled,
  handleIncrease,
  handleDecrease,
  handleMinMaxValue,
  handleWheel,
  commitValue,
  onInputChange,
  inputEl,
  onInputElement,
  format: effectiveFormat,
  channel: toRef(props, "channel"),
  colorSpace: toRef(props, "colorSpace"),
  min: effectiveMin,
  max: effectiveMax,
  placeholder: toRef(props, "placeholder"),
  disableWheelChange: toRef(props, "disableWheelChange"),
  locale: toRef(props, "locale"),
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    role="group"
    :dir="undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readonly ? '' : undefined"
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
