<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "../../primitives/types";
import { createContext, useDirection, useForwardExpose, VisuallyHidden } from "reka-ui";
import { computed, ref, toRef, toRefs } from "vue";
import { Color, type SpaceId } from "@urcolor/core";
import { colorSpaces } from "@urcolor/shared";
import { useCollection, useFormControl, ARROW_KEYS, getClosestThumbIndex, hasMinStepsBetweenValues, linearScale, snapToStep, type ActiveDirection } from "../../shared/utils";
import { useColorChannelModel } from "../../shared/useColorChannelModel";

type Direction = "ltr" | "rtl";
type ThumbAlignment = "contain" | "overflow";

export interface ColorAreaRootProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** The name of the hidden input field for form submission. */
  name?: string | undefined;
  /** Whether the field is required for form submission. */
  required?: boolean;
  /** The controlled color value. Can be bind as `v-model`. */
  modelValue?: Color | string | null;
  /** The default color value when uncontrolled. */
  defaultValue?: Color | string;
  /** When `true`, prevents the user from interacting with the slider area. */
  disabled?: boolean;
  /** The reading direction. If omitted, inherits globally from `ConfigProvider` or assumes LTR. */
  dir?: Direction;
  /** Whether the X axis is visually inverted. */
  xInverted?: boolean;
  /** Whether the Y axis is visually inverted. */
  yInverted?: boolean;
  /** The color space mode to work in (e.g. 'hsl', 'oklch'). */
  colorSpace?: SpaceId;
  /** Which channel maps to the X axis (e.g. 's' for HSL saturation, or 'alpha' for opacity). */
  xChannel?: string;
  /** Which channel maps to the Y axis (e.g. 'l' for HSL lightness, or 'alpha' for opacity). */
  yChannel?: string;
  /** The name of the hidden input carrying the raw X channel value for form submission. */
  xName?: string;
  /** The name of the hidden input carrying the raw Y channel value for form submission. */
  yName?: string;
  /** The minimum permitted steps between multiple thumbs on the X axis. */
  minXStepsBetweenThumbs?: number;
  /** The minimum permitted steps between multiple thumbs on the Y axis. */
  minYStepsBetweenThumbs?: number;
  /**
   * The alignment of the slider area thumb.
   * - `contain`: thumbs will be contained within the bounds of the track.
   * - `overflow`: thumbs will not be bound by the track. No extra offset will be added.
   * @defaultValue 'overflow'
   */
  thumbAlignment?: ThumbAlignment;
}

export type ColorAreaRootEmits = {
  /** Event handler called when the color value changes */
  "update:modelValue": [payload: Color | undefined];
  /** Event handler called when the color value changes. Mirrors `update:modelValue`; present for API parity. */
  "update:color": [payload: Color];
  /** Event handler called on every value change, including mid-drag. */
  "change": [payload: Color];
  /** Event handler called when the value changes at the end of an interaction. */
  "changeEnd": [payload: Color];
};

export interface ColorAreaRootContext {
  disabled: Ref<boolean>;
  minX: Ref<number>;
  maxX: Ref<number>;
  minY: Ref<number>;
  maxY: Ref<number>;
  modelValue?: Readonly<Ref<number[][] | null | undefined>>;
  currentModelValue: Ref<number[][]>;
  valueIndexToChangeRef: Ref<number>;
  thumbRef: Ref<HTMLElement | undefined>;
  areaElement: Ref<HTMLElement | undefined>;
  isSlidingFromLeft: Ref<boolean>;
  isSlidingFromTop: Ref<boolean>;
  thumbAlignment: Ref<ThumbAlignment>;
  colorSpace: Ref<SpaceId>;
  xChannelKey: Ref<string>;
  yChannelKey: Ref<string>;
  colorRef: Readonly<Ref<Color | undefined>>;
  dir: Ref<Direction>;
  isDragging: Ref<boolean>;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleSlideStart: (event: PointerEvent) => void;
  handleSlideMove: (event: PointerEvent) => void;
  handleSlideEnd: () => void;
  snapshotValues: () => void;
}

export const [injectColorAreaRootContext, provideColorAreaRootContext]
  = createContext<ColorAreaRootContext>("ColorAreaRoot");
</script>

<script setup lang="ts">
import { Primitive } from "reka-ui";
defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<ColorAreaRootProps>(), {
  disabled: false,
  defaultValue: "hsl(0, 100%, 50%)",
  xInverted: false,
  yInverted: false,
  colorSpace: "hsl",
  minXStepsBetweenThumbs: 0,
  minYStepsBetweenThumbs: 0,
  thumbAlignment: "overflow",
  as: "span",
});
const emits = defineEmits<ColorAreaRootEmits>();

defineSlots<{
  default?: (props: {
    /** Current color value */
    modelValue: Color | undefined;
  }) => any;
}>();

const { disabled, thumbAlignment, dir: propDir } = toRefs(props);
const dir = useDirection(propDir); // eslint-disable-line vue/no-dupe-keys
const { forwardRef, currentElement } = useForwardExpose();
const isFormControl = useFormControl(currentElement);
const { CollectionSlot } = useCollection({ isProvider: true });

// Resolve default xChannel/yChannel from colorSpace
const spaceConfig = computed(() => colorSpaces[props.colorSpace]);
const xChannelKey = computed(() => props.xChannel ?? spaceConfig.value?.channels[0]?.key ?? "h");
const yChannelKey = computed(() => props.yChannel ?? spaceConfig.value?.channels[1]?.key ?? "s");

const { colorRef, displayValues, configs, setDisplayValues } = useColorChannelModel({
  colorSpace: toRef(props, "colorSpace"),
  channels: computed(() => [xChannelKey.value, yChannelKey.value]),
  modelValue: toRef(props, "modelValue"),
  defaultValue: toRef(props, "defaultValue"),
  emit: emits,
});

const xConfig = computed(() => configs.value[0]);
const yConfig = computed(() => configs.value[1]);

const minX = computed(() => xConfig.value?.min ?? 0);
const maxX = computed(() => xConfig.value?.max ?? 100);
const minY = computed(() => yConfig.value?.min ?? 0);
const maxY = computed(() => yConfig.value?.max ?? 100);
const stepX = computed(() => xConfig.value?.step ?? 1);
const stepY = computed(() => yConfig.value?.step ?? 1);

// The area drives a single thumb, so the numeric model the slider mechanics
// work in is the pair of display values wrapped in a one-entry tuple list.
const internalValue = computed<number[][]>(() => [[displayValues.value[0] ?? minX.value, displayValues.value[1] ?? minY.value]]);

const currentModelValue = computed(() => [...internalValue.value]);

const valueIndexToChangeRef = ref(0);
const valuesBeforeSlideStartRef = ref(currentModelValue.value);
const rectRef = ref<DOMRect>();
const offsetPosition = ref<{ x: number; y: number }>();

// Determine axis directions
const isSlidingFromLeft = computed(() => {
  return (dir.value !== "rtl" && !props.xInverted) || (dir.value !== "ltr" && props.xInverted);
});
const isSlidingFromTop = computed(() => !props.yInverted);

function getPointFromPointerEvent(event: PointerEvent, slideStart?: boolean): number[] {
  const rect = rectRef.value || (areaElement.value ?? currentElement.value).getBoundingClientRect();
  rectRef.value = rect;

  const thumb = thumbRef.value;
  const thumbWidth = thumbAlignment.value === "contain" && thumb ? thumb.clientWidth : 0;
  const thumbHeight = thumbAlignment.value === "contain" && thumb ? thumb.clientHeight : 0;

  if (!offsetPosition.value && !slideStart && thumbAlignment.value === "contain" && thumb) {
    const thumbRect = thumb.getBoundingClientRect();
    offsetPosition.value = {
      x: event.clientX - thumbRect.left,
      y: event.clientY - thumbRect.top,
    };
  }

  const inputX: [number, number] = [0, rect.width - thumbWidth];
  const outputX: [number, number] = isSlidingFromLeft.value ? [minX.value, maxX.value] : [maxX.value, minX.value];
  const scaleX = linearScale(inputX, outputX);

  const inputY: [number, number] = [0, rect.height - thumbHeight];
  const outputY: [number, number] = isSlidingFromTop.value ? [minY.value, maxY.value] : [maxY.value, minY.value];
  const scaleY = linearScale(inputY, outputY);

  const posX = slideStart
    ? event.clientX - rect.left - thumbWidth / 2
    : event.clientX - rect.left - (offsetPosition.value?.x ?? 0);
  const posY = slideStart
    ? event.clientY - rect.top - thumbHeight / 2
    : event.clientY - rect.top - (offsetPosition.value?.y ?? 0);

  return [scaleX(posX), scaleY(posY)];
}

const lastPointerPosition = ref<{ x: number; y: number }>();

function handleSlideStart(event: PointerEvent) {
  const point = getPointFromPointerEvent(event, true);
  const closestIndex = getClosestThumbIndex(currentModelValue.value, point, minX.value, maxX.value, minY.value, maxY.value);
  if (closestIndex === -1)
    return;
  isDragging.value = true;
  lastPointerPosition.value = { x: event.clientX, y: event.clientY };
  updateValues(point, closestIndex, { skipFocus: true });
}

function handleSlideMove(event: PointerEvent) {
  const point = getPointFromPointerEvent(event);
  lastPointerPosition.value = { x: event.clientX, y: event.clientY };
  updateValues(point, valueIndexToChangeRef.value);
}

function handleSlideEnd() {
  isDragging.value = false;
  rectRef.value = undefined;
  offsetPosition.value = undefined;
  lastPointerPosition.value = undefined;
  const prevValue = valuesBeforeSlideStartRef.value[valueIndexToChangeRef.value];
  const nextValue = currentModelValue.value[valueIndexToChangeRef.value];
  const hasChanged = prevValue?.[0] !== nextValue?.[0] || prevValue?.[1] !== nextValue?.[1];
  if (hasChanged && colorRef.value)
    emits("changeEnd", colorRef.value);
}

const minXStepsBetweenThumbs = computed(() => props.minXStepsBetweenThumbs);
const minYStepsBetweenThumbs = computed(() => props.minYStepsBetweenThumbs);

function clampAxis(nextValue: number, axisIndex: number, atIndex: number, minGap: number): number {
  if (minGap <= 0)
    return nextValue;
  const testValues = currentModelValue.value.map((v, i) => i === atIndex ? nextValue : (v[axisIndex] ?? 0));
  if (!hasMinStepsBetweenValues([...testValues].sort((a, b) => a - b), minGap))
    return currentModelValue.value[atIndex]?.[axisIndex] ?? nextValue;
  return nextValue;
}

function updateValues(point: number[], atIndex: number, { commit = false, skipFocus = false } = {}) {
  const nextX = snapToStep(point[0] ?? 0, minX.value, maxX.value, stepX.value);
  const nextY = snapToStep(point[1] ?? 0, minY.value, maxY.value, stepY.value);

  const finalX = clampAxis(nextX, 0, atIndex, minXStepsBetweenThumbs.value * stepX.value);
  const finalY = clampAxis(nextY, 1, atIndex, minYStepsBetweenThumbs.value * stepY.value);

  const nextValues = [...currentModelValue.value];
  nextValues[atIndex] = [finalX, finalY];

  valueIndexToChangeRef.value = atIndex;

  const hasChanged = JSON.stringify(nextValues) !== JSON.stringify(internalValue.value);

  if (hasChanged) {
    if (!skipFocus) {
      thumbRef.value?.focus();
    }
    setDisplayValues([finalX, finalY], { commit });
  }
}

const STEP_KEY_DELTAS: Record<string, { axis: ActiveDirection; sign: number }> = {
  ArrowRight: { axis: "x", sign: 1 },
  ArrowLeft: { axis: "x", sign: -1 },
  ArrowDown: { axis: "y", sign: 1 },
  ArrowUp: { axis: "y", sign: -1 },
};

function handleStepKeyDown(event: KeyboardEvent) {
  const delta = STEP_KEY_DELTAS[event.key];
  if (!delta)
    return;

  const atIndex = valueIndexToChangeRef.value;
  const value = currentModelValue.value[atIndex];
  if (!value)
    return;

  const multiplier = (event.shiftKey && ARROW_KEYS.includes(event.key)) ? 10 : 1;

  const dirMultiplier = delta.axis === "x"
    ? (isSlidingFromLeft.value ? 1 : -1)
    : (isSlidingFromTop.value ? 1 : -1);
  const step = delta.axis === "x" ? stepX.value : stepY.value;
  const offset = step * multiplier * delta.sign * dirMultiplier;

  const vx = value[0] ?? 0;
  const vy = value[1] ?? 0;
  const point: number[] = delta.axis === "x"
    ? [vx + offset, vy]
    : [vx, vy + offset];

  updateValues(point, atIndex, { commit: true });
}

function handleBoundaryKey(axis: ActiveDirection, boundaryValue: number) {
  const atIndex = valueIndexToChangeRef.value;
  const value = currentModelValue.value[atIndex];
  if (!value)
    return;

  let effectiveValue = boundaryValue;
  if (axis === "x" && !isSlidingFromLeft.value) {
    effectiveValue = boundaryValue === minX.value ? maxX.value : minX.value;
  } else if (axis === "y" && !isSlidingFromTop.value) {
    effectiveValue = boundaryValue === minY.value ? maxY.value : minY.value;
  }

  const point = axis === "x"
    ? [effectiveValue, value[1] ?? 0]
    : [value[0] ?? 0, effectiveValue];
  updateValues(point, atIndex, { commit: true });
}

function handleKeyDown(event: KeyboardEvent) {
  if (disabled.value)
    return;
  if (event.key === "Home") {
    handleBoundaryKey("x", minX.value);
    event.preventDefault();
  } else if (event.key === "End") {
    handleBoundaryKey("x", maxX.value);
    event.preventDefault();
  } else if (event.key === "PageUp") {
    handleBoundaryKey("y", minY.value);
    event.preventDefault();
  } else if (event.key === "PageDown") {
    handleBoundaryKey("y", maxY.value);
    event.preventDefault();
  } else if (ARROW_KEYS.includes(event.key)) {
    handleStepKeyDown(event);
    event.preventDefault();
  }
}

function snapshotValues() {
  valuesBeforeSlideStartRef.value = currentModelValue.value;
}

const thumbRef = ref<HTMLElement | undefined>();
const areaElement = ref<HTMLElement | undefined>();
const isDragging = ref(false);

provideColorAreaRootContext({
  modelValue: internalValue,
  currentModelValue,
  valueIndexToChangeRef,
  thumbRef,
  areaElement,
  minX,
  maxX,
  minY,
  maxY,
  disabled,
  isSlidingFromLeft,
  isSlidingFromTop,
  thumbAlignment,
  colorSpace: computed(() => props.colorSpace),
  xChannelKey,
  yChannelKey,
  colorRef,
  dir,
  isDragging,
  handleKeyDown,
  handleSlideStart,
  handleSlideMove,
  handleSlideEnd,
  snapshotValues,
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      v-bind="$attrs"
      :ref="forwardRef"
      :as-child="asChild"
      :as="as"
      :dir="dir"
      role="group"
      :aria-disabled="disabled || undefined"
      :data-disabled="disabled ? '' : undefined"
      :style="{
        ['--reka-slider-area-thumb-transform' as any]: `translate(${!isSlidingFromLeft && thumbAlignment === 'overflow' ? '50%' : '-50%'}, ${!isSlidingFromTop && thumbAlignment === 'overflow' ? '50%' : '-50%'})`,
      }"
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

      <VisuallyHidden
        v-if="isFormControl && xName"
        as="input"
        type="text"
        :value="currentModelValue[0]?.[0] ?? ''"
        :name="xName"
        :disabled="disabled"
      />

      <VisuallyHidden
        v-if="isFormControl && yName"
        as="input"
        type="text"
        :value="currentModelValue[0]?.[1] ?? ''"
        :name="yName"
        :disabled="disabled"
      />
    </Primitive>
  </CollectionSlot>
</template>
