<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, useDirection, useForwardExpose, VisuallyHidden } from "reka-ui";
import { computed, ref, toRef, toRefs } from "vue";
import { Color, type SpaceId } from "@urcolor/core";
import { colorSpaces } from "@urcolor/core";
import { cartesianToPolar, normalizeAngle } from "@urcolor/core";
import { cyclicWrap, snapToStep, useFormControl } from "../../shared/utils";
import { useColorChannelModel } from "../../shared/useColorChannelModel";
import { usePointerDrag } from "../../shared/usePointerDrag";

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
  colorSpace?: SpaceId;
  channel?: string;
  startAngle?: number;
  /** Inner radius as a ratio of the outer radius (0–1). Used for hit testing. Default 0.7 */
  innerRadius?: number;
}

export type ColorRingRootEmits = {
  /** Event handler called when the color value changes */
  "update:modelValue": [payload: Color | undefined];
  /** Event handler called when the color value changes. Mirrors `update:modelValue`; present for API parity. */
  "update:color": [payload: Color];
  /** Event handler called on every value change, including mid-drag. */
  "change": [payload: Color];
  /** Event handler called when the value changes at the end of an interaction. */
  "changeEnd": [payload: Color];
};

export interface ColorRingRootContext {
  disabled: Ref<boolean>;
  min: Ref<number>;
  max: Ref<number>;
  step: Ref<number>;
  colorSpace: Ref<SpaceId>;
  channelKey: Ref<string>;
  colorRef: Readonly<Ref<Color | undefined>>;
  currentValue: Ref<number>;
  startAngle: Ref<number>;
  dir: Ref<Direction>;
  thumbElement: Ref<HTMLElement | undefined>;
  innerRadius: Ref<number>;
  isDragging: Ref<boolean>;
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

const spaceConfig = computed(() => colorSpaces[props.colorSpace]);
const channelKey = computed(() => props.channel ?? spaceConfig.value?.channels[0]?.key ?? "h");

const { colorRef, displayValues, configs, setDisplayValues } = useColorChannelModel({
  colorSpace: toRef(props, "colorSpace"),
  channels: computed(() => [channelKey.value]),
  modelValue: toRef(props, "modelValue"),
  defaultValue: toRef(props, "defaultValue"),
  emit: emits,
});

const channelConfig = computed(() => configs.value[0]);

const min = computed(() => channelConfig.value?.min ?? 0);
const max = computed(() => channelConfig.value?.max ?? 360);
const step = computed(() => channelConfig.value?.step ?? 1);

const currentValue = computed(() => displayValues.value[0] ?? min.value);

const thumbElement = ref<HTMLElement>();

const valueBeforeSlide = ref(currentValue.value);

function getValueFromPointer(event: PointerEvent): number {
  const rect = drag.rect.value ?? currentElement.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const { angle } = cartesianToPolar(event.clientX, event.clientY, cx, cy);
  const normalized = normalizeAngle(angle, props.startAngle);
  return min.value + (normalized / 360) * (max.value - min.value);
}

function updateValue(val: number, commit = false) {
  const snapped = snapToStep(val, min.value, max.value, step.value);
  const hasChanged = Math.abs(snapped - currentValue.value) > 0.001;
  if (!hasChanged) {
    // Below the feedback threshold: record the value but stay silent.
    displayValues.value = [snapped];
    return;
  }

  if (!isDragging.value) thumbElement.value?.focus();

  setDisplayValues([snapped], { commit });
}

/** Reject a pointerdown that lands outside the ring's annulus. */
function isInsideAnnulus(event: PointerEvent): boolean {
  const rect = currentElement.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const outerR = Math.min(rect.width, rect.height) / 2;
  const innerR = outerR * props.innerRadius;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const distSq = dx * dx + dy * dy;
  return distSq <= outerR * outerR && distSq >= innerR * innerR;
}

const drag = usePointerDrag({
  disabled,
  target: currentElement,
  canStart: isInsideAnnulus,
  onMove(event, phase) {
    if (phase === "start") {
      thumbElement.value?.focus();
      valueBeforeSlide.value = currentValue.value;
    }
    updateValue(getValueFromPointer(event));
  },
  onEnd() {
    if (valueBeforeSlide.value !== currentValue.value && colorRef.value) {
      emits("changeEnd", colorRef.value);
    }
  },
});

const isDragging = drag.isDragging;

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
    newVal = cyclicWrap(newVal, min.value, max.value);
  } else {
    newVal = Math.max(min.value, Math.min(max.value, newVal));
  }
  updateValue(newVal, true);
}

const isFormControl = useFormControl(currentElement);

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
  isDragging,
});
</script>

<template>
  <Primitive
    v-bind="$attrs"
    :ref="forwardRef"
    :as-child="asChild"
    :as="as"
    :dir="dir"
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
