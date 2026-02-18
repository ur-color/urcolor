<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, useDirection, useForwardExpose, VisuallyHidden, Primitive } from "reka-ui";
import { computed, ref, shallowRef, toRefs, watch } from "vue";
import { Color } from "internationalized-color";
import { colorSpaces, getChannelConfig, displayToCulori, culoriToDisplay, type ChannelConfig } from "@urcolor/core";
import { cartesianToPolar, normalizeAngle, clampToCircle } from "@urcolor/core";

type Direction = "ltr" | "rtl";

export interface ColorWheelRootProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  name?: string | undefined;
  required?: boolean;
  modelValue?: Color | string | null;
  defaultValue?: Color | string;
  disabled?: boolean;
  dir?: Direction;
  colorSpace?: string;
  channelAngle?: string;
  channelRadius?: string;
  startAngle?: number;
}

export type ColorWheelRootEmits = {
  "update:modelValue": [payload: Color | undefined];
  "valueCommit": [payload: Color];
};

export type ActiveDirection = "x" | "y";

export interface ColorWheelRootContext {
  disabled: Ref<boolean>;
  colorSpace: Ref<string>;
  angleChannelKey: Ref<string>;
  radiusChannelKey: Ref<string>;
  colorRef: Readonly<Ref<Color | undefined>>;
  currentAngleValue: Ref<number>;
  currentRadiusValue: Ref<number>;
  angleMin: Ref<number>;
  angleMax: Ref<number>;
  radiusMin: Ref<number>;
  radiusMax: Ref<number>;
  startAngle: Ref<number>;
  dir: Ref<Direction>;
  activeDirection: Ref<ActiveDirection>;
  thumbXElement: Ref<HTMLElement | undefined>;
  thumbYElement: Ref<HTMLElement | undefined>;
}

export const [injectColorWheelRootContext, provideColorWheelRootContext]
  = createContext<ColorWheelRootContext>("ColorWheelRoot");
</script>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ColorWheelRootProps>(), {
  disabled: false,
  defaultValue: "hsl(0, 100%, 50%)",
  colorSpace: "hsl",
  startAngle: 0,
  as: "span",
});
const emits = defineEmits<ColorWheelRootEmits>();

defineSlots<{
  default?: (props: { modelValue: Color | undefined }) => any;
}>();

const { disabled, dir: propDir } = toRefs(props);
const direction = useDirection(propDir);
const { forwardRef, currentElement } = useForwardExpose();

const ALPHA_CONFIG: ChannelConfig = {
  key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1,
};

const spaceConfig = computed(() => colorSpaces[props.colorSpace]);
const angleChannelKey = computed(() => props.channelAngle ?? spaceConfig.value?.channels[0]?.key ?? "h");
const radiusChannelKey = computed(() => props.channelRadius ?? spaceConfig.value?.channels[1]?.key ?? "s");

const angleIsAlpha = computed(() => angleChannelKey.value === "alpha");
const radiusIsAlpha = computed(() => radiusChannelKey.value === "alpha");

const angleConfig = computed(() => angleIsAlpha.value ? ALPHA_CONFIG : getChannelConfig(props.colorSpace, angleChannelKey.value));
const radiusConfig = computed(() => radiusIsAlpha.value ? ALPHA_CONFIG : getChannelConfig(props.colorSpace, radiusChannelKey.value));

const angleMin = computed(() => angleConfig.value?.min ?? 0);
const angleMax = computed(() => angleConfig.value?.max ?? 360);
const angleStep = computed(() => angleConfig.value?.step ?? 1);
const radiusMin = computed(() => radiusConfig.value?.min ?? 0);
const radiusMax = computed(() => radiusConfig.value?.max ?? 100);
const radiusStep = computed(() => radiusConfig.value?.step ?? 1);

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

function colorToDisplayValues(color: Color | undefined): { angle: number; radius: number } {
  if (!color || !angleConfig.value || !radiusConfig.value) return { angle: angleMin.value, radius: radiusMin.value };
  const converted = color.to(props.colorSpace);
  if (!converted) return { angle: angleMin.value, radius: radiusMin.value };
  const rawAngle = angleIsAlpha.value ? (color.alpha ?? 1) : converted.get(angleChannelKey.value, 0);
  const rawRadius = radiusIsAlpha.value ? (color.alpha ?? 1) : converted.get(radiusChannelKey.value, 0);
  return {
    angle: culoriToDisplay(angleConfig.value, rawAngle),
    radius: culoriToDisplay(radiusConfig.value, rawRadius),
  };
}

const initValues = colorToDisplayValues(colorRef.value);
const currentAngleValue = ref(initValues.angle);
const currentRadiusValue = ref(initValues.radius);

watch([colorRef, angleChannelKey, radiusChannelKey], ([color]) => {
  const newVals = colorToDisplayValues(color);
  if (Math.abs(currentAngleValue.value - newVals.angle) > 0.001) currentAngleValue.value = newVals.angle;
  if (Math.abs(currentRadiusValue.value - newVals.radius) > 0.001) currentRadiusValue.value = newVals.radius;
});

function displayValuesToColor(angle: number, radius: number): Color | undefined {
  if (!colorRef.value || !angleConfig.value || !radiusConfig.value) return undefined;
  const culoriAngle = displayToCulori(angleConfig.value, angle);
  const culoriRadius = displayToCulori(radiusConfig.value, radius);
  const updates: Record<string, number> = {};
  if (!angleIsAlpha.value) updates[angleChannelKey.value] = culoriAngle;
  if (!radiusIsAlpha.value) updates[radiusChannelKey.value] = culoriRadius;
  let result = colorRef.value.set({ mode: props.colorSpace, ...updates });
  if (angleIsAlpha.value) result = result.set({ alpha: culoriAngle });
  if (radiusIsAlpha.value) result = result.set({ alpha: culoriRadius });
  return result;
}

function snap(value: number, min: number, max: number, step: number): number {
  const decimals = (String(step).split(".")[1] || "").length;
  const snapped = Math.round((value - min) / step) * step + min;
  const factor = 10 ** decimals;
  return Math.max(min, Math.min(max, Math.round(snapped * factor) / factor));
}

const activeDirection = ref<ActiveDirection>("x");
const thumbXElement = ref<HTMLElement>();
const thumbYElement = ref<HTMLElement>();

const valueBeforeSlide = ref({ angle: currentAngleValue.value, radius: currentRadiusValue.value });
const rectRef = ref<DOMRect>();

function getValuesFromPointer(event: PointerEvent): { angle: number; radius: number } {
  const rect = rectRef.value || currentElement.value.getBoundingClientRect();
  rectRef.value = rect;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const maxR = Math.min(rect.width, rect.height) / 2;

  const clamped = clampToCircle(event.clientX, event.clientY, cx, cy, maxR);
  const { angle: rawAngle, radius } = cartesianToPolar(clamped.x, clamped.y, cx, cy);
  const normalizedAngle = normalizeAngle(rawAngle, props.startAngle);
  const normalizedRadius = Math.min(1, radius / maxR);

  return {
    angle: angleMin.value + (normalizedAngle / 360) * (angleMax.value - angleMin.value),
    radius: radiusMin.value + normalizedRadius * (radiusMax.value - radiusMin.value),
  };
}

function updateValues(angle: number, radius: number, commit = false) {
  const snappedAngle = snap(angle, angleMin.value, angleMax.value, angleStep.value);
  const snappedRadius = snap(radius, radiusMin.value, radiusMax.value, radiusStep.value);

  const hasChanged = Math.abs(snappedAngle - currentAngleValue.value) > 0.001
    || Math.abs(snappedRadius - currentRadiusValue.value) > 0.001;

  currentAngleValue.value = snappedAngle;
  currentRadiusValue.value = snappedRadius;

  if (hasChanged) {
    const thumb = activeDirection.value === "x" ? thumbXElement.value : thumbYElement.value;
    thumb?.focus();
  }

  const newColor = displayValuesToColor(snappedAngle, snappedRadius);
  if (newColor) {
    colorRef.value = newColor;
    emits("update:modelValue", newColor);
    if (commit) emits("valueCommit", newColor);
  }
}

function handlePointerDown(event: PointerEvent) {
  if (props.disabled) return;
  const target = event.target as HTMLElement;

  // Ignore clicks outside the circle
  const rect = currentElement.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const maxR = Math.min(rect.width, rect.height) / 2;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  if (dx * dx + dy * dy > maxR * maxR) return;

  target.setPointerCapture(event.pointerId);
  event.preventDefault();

  // Focus thumb if pointer is on or inside a thumb element
  if (thumbXElement.value && (target === thumbXElement.value || thumbXElement.value.contains(target))) {
    activeDirection.value = "x";
    thumbXElement.value.focus();
  } else if (thumbYElement.value && (target === thumbYElement.value || thumbYElement.value.contains(target))) {
    activeDirection.value = "y";
    thumbYElement.value.focus();
  }

  valueBeforeSlide.value = { angle: currentAngleValue.value, radius: currentRadiusValue.value };
  const vals = getValuesFromPointer(event);
  updateValues(vals.angle, vals.radius);
}

const lastPointerPosition = ref<{ x: number; y: number }>();

function handlePointerMove(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.hasPointerCapture(event.pointerId)) return;
  if (lastPointerPosition.value) {
    const dx = Math.abs(event.clientX - lastPointerPosition.value.x);
    const dy = Math.abs(event.clientY - lastPointerPosition.value.y);
    activeDirection.value = dx >= dy ? "x" : "y";
  }
  lastPointerPosition.value = { x: event.clientX, y: event.clientY };
  const vals = getValuesFromPointer(event);
  updateValues(vals.angle, vals.radius);
}

function handlePointerUp(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.hasPointerCapture(event.pointerId)) return;
  target.releasePointerCapture(event.pointerId);
  rectRef.value = undefined;
  lastPointerPosition.value = undefined;
  const prev = valueBeforeSlide.value;
  if (prev.angle !== currentAngleValue.value || prev.radius !== currentRadiusValue.value) {
    if (colorRef.value) emits("valueCommit", colorRef.value);
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled) return;
  let angleOffset = 0;
  let radiusOffset = 0;
  const multiplier = event.shiftKey ? 10 : 1;

  if (event.key === "ArrowRight") angleOffset = angleStep.value * multiplier;
  else if (event.key === "ArrowLeft") angleOffset = -angleStep.value * multiplier;
  else if (event.key === "ArrowUp") radiusOffset = radiusStep.value * multiplier;
  else if (event.key === "ArrowDown") radiusOffset = -radiusStep.value * multiplier;
  else if (event.key === "PageUp") radiusOffset = radiusStep.value * 10;
  else if (event.key === "PageDown") radiusOffset = -radiusStep.value * 10;
  else if (event.key === "Home") {
    updateValues(angleMin.value, radiusMin.value, true);
    event.preventDefault();
    return;
  } else if (event.key === "End") {
    updateValues(angleMax.value, radiusMax.value, true);
    event.preventDefault();
    return;
  } else {
    return;
  }

  event.preventDefault();
  if (angleOffset !== 0) activeDirection.value = "x";
  if (radiusOffset !== 0) activeDirection.value = "y";

  let newAngle = currentAngleValue.value + angleOffset;
  const isCyclic = angleConfig.value?.format === "degree";
  if (isCyclic) {
    const range = angleMax.value - angleMin.value;
    newAngle = ((newAngle - angleMin.value) % range + range) % range + angleMin.value;
  } else {
    newAngle = Math.max(angleMin.value, Math.min(angleMax.value, newAngle));
  }

  const newRadius = Math.max(radiusMin.value, Math.min(radiusMax.value, currentRadiusValue.value + radiusOffset));
  updateValues(newAngle, newRadius, true);
}

const isFormControl = computed(() => currentElement.value ? Boolean(currentElement.value.closest("form")) : false);

provideColorWheelRootContext({
  disabled,
  colorSpace: computed(() => props.colorSpace),
  angleChannelKey,
  radiusChannelKey,
  colorRef,
  currentAngleValue,
  currentRadiusValue,
  angleMin,
  angleMax,
  radiusMin,
  radiusMax,
  startAngle: computed(() => props.startAngle),
  dir: direction,
  activeDirection,
  thumbXElement,
  thumbYElement,
});
</script>

<template>
  <Primitive
    v-bind="$attrs"
    :ref="forwardRef"
    :as-child="asChild"
    :as="as"
    :dir="direction"
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
