<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, useDirection, useForwardExpose, VisuallyHidden, Primitive } from "reka-ui";
import { computed, ref, shallowRef, toRefs, watch } from "vue";
import { Color, type SpaceId } from "@urcolor/core";
import { colorSpaces, getChannelConfig, displayToNative, nativeToDisplay, type ChannelConfig } from "@urcolor/core";
import { cartesianToPolar, normalizeAngle, clampToCircle } from "@urcolor/core";
import { cyclicWrap, snapToStep } from "../../shared/utils";

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
  colorSpace?: SpaceId;
  angleChannel?: string;
  radiusChannel?: string;
  startAngle?: number;
}

export type ColorWheelRootEmits = {
  /** Event handler called when the color value changes */
  "update:modelValue": [payload: Color | undefined];
  /** Event handler called when the color value changes. Mirrors `update:modelValue`; present for API parity. */
  "update:color": [payload: Color];
  /** Event handler called on every value change, including mid-drag. */
  "change": [payload: Color];
  /** Event handler called when the value changes at the end of an interaction. */
  "changeEnd": [payload: Color];
};

export interface ColorWheelRootContext {
  disabled: Ref<boolean>;
  colorSpace: Ref<SpaceId>;
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
  thumbElement: Ref<HTMLElement | undefined>;
  isDragging: Ref<boolean>;
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
  key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1,
};

const spaceConfig = computed(() => colorSpaces[props.colorSpace]);
const angleChannelKey = computed(() => props.angleChannel ?? spaceConfig.value?.channels[0]?.key ?? "h");
const radiusChannelKey = computed(() => props.radiusChannel ?? spaceConfig.value?.channels[1]?.key ?? "s");

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
  const rawAngle = angleIsAlpha.value ? color.alpha : converted.get(angleChannelKey.value);
  const rawRadius = radiusIsAlpha.value ? color.alpha : converted.get(radiusChannelKey.value);
  return {
    angle: nativeToDisplay(angleConfig.value, rawAngle),
    radius: nativeToDisplay(radiusConfig.value, rawRadius),
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
  const nativeAngle = displayToNative(angleConfig.value, angle);
  const nativeRadius = displayToNative(radiusConfig.value, radius);
  const updates: Record<string, number> = {};
  if (!angleIsAlpha.value) updates[angleChannelKey.value] = nativeAngle;
  if (!radiusIsAlpha.value) updates[radiusChannelKey.value] = nativeRadius;
  let result = colorRef.value.with({ space: props.colorSpace, ...updates });
  if (angleIsAlpha.value) result = result.withAlpha(nativeAngle);
  if (radiusIsAlpha.value) result = result.withAlpha(nativeRadius);
  return result;
}

const thumbElement = ref<HTMLElement>();
const isDragging = ref(false);

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
  const snappedAngle = snapToStep(angle, angleMin.value, angleMax.value, angleStep.value);
  const snappedRadius = snapToStep(radius, radiusMin.value, radiusMax.value, radiusStep.value);

  const hasChanged = Math.abs(snappedAngle - currentAngleValue.value) > 0.001
    || Math.abs(snappedRadius - currentRadiusValue.value) > 0.001;

  currentAngleValue.value = snappedAngle;
  currentRadiusValue.value = snappedRadius;

  if (!hasChanged) return;

  if (!isDragging.value)
    thumbElement.value?.focus();

  const newColor = displayValuesToColor(snappedAngle, snappedRadius);
  if (newColor) {
    colorRef.value = newColor;
    emits("update:modelValue", newColor);
    emits("update:color", newColor);
    emits("change", newColor);
    if (commit) emits("changeEnd", newColor);
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

  // Focus the thumb if the pointer is on or inside it
  if (thumbElement.value && (target === thumbElement.value || thumbElement.value.contains(target)))
    thumbElement.value.focus();

  isDragging.value = true;
  valueBeforeSlide.value = { angle: currentAngleValue.value, radius: currentRadiusValue.value };
  const vals = getValuesFromPointer(event);
  updateValues(vals.angle, vals.radius);
}

const lastPointerPosition = ref<{ x: number; y: number }>();
let rafPending = false;

function handlePointerMove(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.hasPointerCapture(event.pointerId)) return;
  if (rafPending) return;
  rafPending = true;
  const clientX = event.clientX;
  const clientY = event.clientY;
  const pointerId = event.pointerId;
  requestAnimationFrame(() => {
    rafPending = false;
    lastPointerPosition.value = { x: clientX, y: clientY };
    const vals = getValuesFromPointer({ clientX, clientY, pointerId } as PointerEvent);
    updateValues(vals.angle, vals.radius);
  });
}

function handlePointerUp(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.hasPointerCapture(event.pointerId)) return;
  target.releasePointerCapture(event.pointerId);
  isDragging.value = false;
  rectRef.value = undefined;
  lastPointerPosition.value = undefined;
  const prev = valueBeforeSlide.value;
  if (prev.angle !== currentAngleValue.value || prev.radius !== currentRadiusValue.value) {
    if (colorRef.value) emits("changeEnd", colorRef.value);
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

  let newAngle = currentAngleValue.value + angleOffset;
  const isCyclic = angleConfig.value?.format === "degree";
  if (isCyclic) {
    newAngle = cyclicWrap(newAngle, angleMin.value, angleMax.value);
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
  thumbElement,
  isDragging,
});
</script>

<template>
  <Primitive
    v-bind="$attrs"
    :ref="forwardRef"
    :as-child="asChild"
    :as="as"
    :dir="direction"
    :aria-disabled="disabled || undefined"
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
