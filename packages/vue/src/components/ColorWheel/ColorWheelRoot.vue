<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, useDirection, useForwardExpose, VisuallyHidden, Primitive } from "reka-ui";
import { computed, ref, toRef, toRefs } from "vue";
import { Color, type SpaceId } from "@urcolor/core";
import { colorSpaces } from "@urcolor/shared";
import { cartesianToPolar, normalizeAngle, clampToCircle } from "@urcolor/core";
import { cyclicWrap, snapToStep, useFormControl } from "../../shared/utils";
import { useColorChannelModel } from "../../shared/useColorChannelModel";
import { usePointerDrag } from "../../shared/usePointerDrag";

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

const spaceConfig = computed(() => colorSpaces[props.colorSpace]);
const angleChannelKey = computed(() => props.angleChannel ?? spaceConfig.value?.channels[0]?.key ?? "h");
const radiusChannelKey = computed(() => props.radiusChannel ?? spaceConfig.value?.channels[1]?.key ?? "s");

const { colorRef, displayValues, configs, setDisplayValues } = useColorChannelModel({
  colorSpace: toRef(props, "colorSpace"),
  channels: computed(() => [angleChannelKey.value, radiusChannelKey.value]),
  modelValue: toRef(props, "modelValue"),
  defaultValue: toRef(props, "defaultValue"),
  emit: emits,
});

const angleConfig = computed(() => configs.value[0]);
const radiusConfig = computed(() => configs.value[1]);

const angleMin = computed(() => angleConfig.value?.min ?? 0);
const angleMax = computed(() => angleConfig.value?.max ?? 360);
const angleStep = computed(() => angleConfig.value?.step ?? 1);
const radiusMin = computed(() => radiusConfig.value?.min ?? 0);
const radiusMax = computed(() => radiusConfig.value?.max ?? 100);
const radiusStep = computed(() => radiusConfig.value?.step ?? 1);

const currentAngleValue = computed(() => displayValues.value[0] ?? angleMin.value);
const currentRadiusValue = computed(() => displayValues.value[1] ?? radiusMin.value);

const thumbElement = ref<HTMLElement>();

const valueBeforeSlide = ref({ angle: currentAngleValue.value, radius: currentRadiusValue.value });

function getValuesFromPointer(event: PointerEvent): { angle: number; radius: number } {
  const rect = drag.rect.value ?? currentElement.value.getBoundingClientRect();
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

  if (!hasChanged) {
    // Below the feedback threshold: record the values but stay silent.
    displayValues.value = [snappedAngle, snappedRadius];
    return;
  }

  if (!isDragging.value)
    thumbElement.value?.focus();

  setDisplayValues([snappedAngle, snappedRadius], { commit });
}

/** Reject a pointerdown that lands outside the wheel's circle. */
function isInsideCircle(event: PointerEvent): boolean {
  const rect = currentElement.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const maxR = Math.min(rect.width, rect.height) / 2;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  return dx * dx + dy * dy <= maxR * maxR;
}

const drag = usePointerDrag({
  disabled,
  target: currentElement,
  canStart: isInsideCircle,
  onMove(event, phase) {
    if (phase === "start") {
      // Focus the thumb if the pointer is on or inside it
      const target = event.target as HTMLElement;
      if (thumbElement.value && (target === thumbElement.value || thumbElement.value.contains(target)))
        thumbElement.value.focus();
      valueBeforeSlide.value = { angle: currentAngleValue.value, radius: currentRadiusValue.value };
    }
    const vals = getValuesFromPointer(event);
    updateValues(vals.angle, vals.radius);
  },
  onEnd() {
    const prev = valueBeforeSlide.value;
    if (prev.angle !== currentAngleValue.value || prev.radius !== currentRadiusValue.value) {
      if (colorRef.value) emits("changeEnd", colorRef.value);
    }
  },
});

const isDragging = drag.isDragging;

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

const isFormControl = useFormControl(currentElement);

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
    @pointerdown="drag.onPointerDown"
    @pointermove="drag.onPointerMove"
    @pointerup="drag.onPointerUp"
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
