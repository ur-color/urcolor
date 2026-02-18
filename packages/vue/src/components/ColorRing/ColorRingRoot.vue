<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, useDirection, useForwardExpose, VisuallyHidden } from "reka-ui";
import { computed, ref, shallowRef, toRefs, watch } from "vue";
import { Color } from "internationalized-color";
import { colorSpaces, getChannelConfig, displayToCulori, culoriToDisplay, type ChannelConfig } from "@urcolor/core";
import { cartesianToPolar, normalizeAngle } from "@urcolor/core";

type Direction = "ltr" | "rtl";

export interface ColorRingRootProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  name?: string | undefined;
  required?: boolean;
  modelValue?: Color | string | null;
  defaultValue?: Color | string;
  disabled?: boolean;
  dir?: Direction;
  colorSpace?: string;
  channel?: string;
  startAngle?: number;
  /** Inner radius as a ratio of the outer radius (0–1). Used for hit testing. Default 0.7 */
  innerRadius?: number;
}

export type ColorRingRootEmits = {
  "update:modelValue": [payload: Color | undefined];
  "valueCommit": [payload: Color];
};

export interface ColorRingRootContext {
  disabled: Ref<boolean>;
  min: Ref<number>;
  max: Ref<number>;
  step: Ref<number>;
  colorSpace: Ref<string>;
  channelKey: Ref<string>;
  colorRef: Readonly<Ref<Color | undefined>>;
  currentValue: Ref<number>;
  startAngle: Ref<number>;
  dir: Ref<Direction>;
  thumbElement: Ref<HTMLElement | undefined>;
  innerRadius: Ref<number>;
}

export const [injectColorRingRootContext, provideColorRingRootContext]
  = createContext<ColorRingRootContext>("ColorRingRoot");
</script>

<script setup lang="ts">
import { Primitive } from "reka-ui";
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ColorRingRootProps>(), {
  disabled: false,
  defaultValue: "hsl(0, 100%, 50%)",
  colorSpace: "hsl",
  startAngle: 0,
  innerRadius: 0.7,
  as: "span",
});
const emits = defineEmits<ColorRingRootEmits>();

defineSlots<{
  default?: (props: { modelValue: Color | undefined }) => any;
}>();

const { disabled, dir: propDir } = toRefs(props);
const dir = useDirection(propDir);
const { forwardRef, currentElement } = useForwardExpose();

const ALPHA_CONFIG: ChannelConfig = {
  key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1,
};

const spaceConfig = computed(() => colorSpaces[props.colorSpace]);
const channelKey = computed(() => props.channel ?? spaceConfig.value?.channels[0]?.key ?? "h");
const isAlpha = computed(() => channelKey.value === "alpha");
const channelConfig = computed(() => isAlpha.value ? ALPHA_CONFIG : getChannelConfig(props.colorSpace, channelKey.value));

const min = computed(() => channelConfig.value?.min ?? 0);
const max = computed(() => channelConfig.value?.max ?? 360);
const step = computed(() => channelConfig.value?.step ?? 1);

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

function colorToDisplayValue(color: Color | undefined): number {
  if (!color || !channelConfig.value) return min.value;
  const converted = color.to(props.colorSpace);
  if (!converted) return min.value;
  const raw = isAlpha.value ? (color.alpha ?? 1) : converted.get(channelKey.value, 0);
  return culoriToDisplay(channelConfig.value, raw);
}

const currentValue = ref(colorToDisplayValue(colorRef.value));

watch([colorRef, channelKey], ([color]) => {
  const newVal = colorToDisplayValue(color);
  if (Math.abs(currentValue.value - newVal) < 0.001) return;
  currentValue.value = newVal;
});

function displayValueToColor(val: number): Color | undefined {
  if (!colorRef.value || !channelConfig.value) return undefined;
  const culoriVal = displayToCulori(channelConfig.value, val);
  if (isAlpha.value) {
    return colorRef.value.set({ alpha: culoriVal });
  }
  return colorRef.value.set({ mode: props.colorSpace, [channelKey.value]: culoriVal });
}

const thumbElement = ref<HTMLElement>();

const valueBeforeSlide = ref(currentValue.value);
const rectRef = ref<DOMRect>();
const isDragging = ref(false);

function snapValue(value: number): number {
  const decimals = (String(step.value).split(".")[1] || "").length;
  const snapped = Math.round((value - min.value) / step.value) * step.value + min.value;
  const factor = 10 ** decimals;
  return Math.max(min.value, Math.min(max.value, Math.round(snapped * factor) / factor));
}

function getValueFromPointer(event: PointerEvent): number {
  const rect = rectRef.value || currentElement.value.getBoundingClientRect();
  rectRef.value = rect;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const { angle } = cartesianToPolar(event.clientX, event.clientY, cx, cy);
  const normalized = normalizeAngle(angle, props.startAngle);
  return min.value + (normalized / 360) * (max.value - min.value);
}

function updateValue(val: number, commit = false) {
  const snapped = snapValue(val);
  const hasChanged = Math.abs(snapped - currentValue.value) > 0.001;
  if (!hasChanged && !commit) return;
  currentValue.value = snapped;

  if (hasChanged) thumbElement.value?.focus();

  const newColor = displayValueToColor(snapped);
  if (newColor) {
    colorRef.value = newColor;
    emits("update:modelValue", newColor);
    if (commit) emits("valueCommit", newColor);
  }
}

function handlePointerDown(event: PointerEvent) {
  if (props.disabled) return;
  const target = event.target as HTMLElement;

  // Ignore clicks outside the ring (annulus)
  const rect = currentElement.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const outerR = Math.min(rect.width, rect.height) / 2;
  const innerR = outerR * props.innerRadius;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const distSq = dx * dx + dy * dy;
  if (distSq > outerR * outerR || distSq < innerR * innerR) return;

  target.setPointerCapture(event.pointerId);
  event.preventDefault();

  if (thumbElement.value && (target === thumbElement.value || thumbElement.value.contains(target))) {
    thumbElement.value.focus();
  }

  isDragging.value = true;
  valueBeforeSlide.value = currentValue.value;
  updateValue(getValueFromPointer(event));
}

function handlePointerMove(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.hasPointerCapture(event.pointerId)) return;
  updateValue(getValueFromPointer(event));
}

function handlePointerUp(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.hasPointerCapture(event.pointerId)) return;
  target.releasePointerCapture(event.pointerId);
  isDragging.value = false;
  rectRef.value = undefined;
  if (valueBeforeSlide.value !== currentValue.value && colorRef.value) {
    emits("valueCommit", colorRef.value);
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled) return;
  let offset = 0;
  const multiplier = event.shiftKey ? 10 : 1;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") offset = step.value * multiplier;
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") offset = -step.value * multiplier;
  else if (event.key === "PageUp") offset = step.value * 10;
  else if (event.key === "PageDown") offset = -step.value * 10;
  else if (event.key === "Home") { updateValue(min.value, true); event.preventDefault(); return; }
  else if (event.key === "End") { updateValue(max.value, true); event.preventDefault(); return; }
  else return;

  event.preventDefault();
  // For cyclic channels (hue), wrap around
  let newVal = currentValue.value + offset;
  const isCyclic = channelConfig.value?.format === "degree";
  if (isCyclic) {
    newVal = ((newVal - min.value) % (max.value - min.value) + (max.value - min.value)) % (max.value - min.value) + min.value;
  } else {
    newVal = Math.max(min.value, Math.min(max.value, newVal));
  }
  updateValue(newVal, true);
}

const isFormControl = computed(() => currentElement.value ? Boolean(currentElement.value.closest("form")) : false);

provideColorRingRootContext({
  disabled,
  min,
  max,
  step,
  colorSpace: computed(() => props.colorSpace),
  channelKey,
  colorRef,
  currentValue,
  startAngle: computed(() => props.startAngle),
  dir,
  thumbElement,
  innerRadius: computed(() => props.innerRadius),
});
</script>

<template>
  <Primitive
    v-bind="$attrs"
    :ref="forwardRef"
    :as-child="asChild"
    :as="as"
    :dir="dir"
    :aria-disabled="disabled"
    :data-disabled="disabled ? '' : undefined"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @keydown="handleKeyDown"
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
  </Primitive>
</template>
