<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, useDirection, useForwardExpose, VisuallyHidden } from "reka-ui";
import { computed, ref, shallowRef, toRefs, watch } from "vue";
import { Color, type SpaceId } from "@urcolor/core";
import { colorSpaces, getChannelConfig, displayToNative, nativeToDisplay, type ChannelConfig } from "@urcolor/core";
import { useCollection, useFormControl, ARROW_KEYS, PAGE_KEYS, getClosestThumbIndex, hasMinStepsBetweenValues, linearScale, snapToStep, type ActiveDirection } from "../../shared/utils";

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
  invertedX?: boolean;
  /** Whether the Y axis is visually inverted. */
  invertedY?: boolean;
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
  isSlidingFromLeft: Ref<boolean>;
  isSlidingFromTop: Ref<boolean>;
  thumbAlignment: Ref<ThumbAlignment>;
  colorSpace: Ref<SpaceId>;
  xChannelKey: Ref<string>;
  yChannelKey: Ref<string>;
  colorRef: Readonly<Ref<Color | undefined>>;
  dir: Ref<Direction>;
  isDragging: Ref<boolean>;
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
  invertedX: false,
  invertedY: false,
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

// Alpha channel config (display 0-100, culori 0-1)
const ALPHA_CONFIG: ChannelConfig = {
  key: "alpha",
  label: "Alpha",
  min: 0,
  max: 100,
  step: 1,
  format: "percentage",
  nativeMin: 0,
  nativeMax: 1,
};

// Resolve default xChannel/yChannel from colorSpace
const spaceConfig = computed(() => colorSpaces[props.colorSpace]);
const xChannelKey = computed(() => props.xChannel ?? spaceConfig.value?.channels[0]?.key ?? "h");
const yChannelKey = computed(() => props.yChannel ?? spaceConfig.value?.channels[1]?.key ?? "s");
const xIsAlpha = computed(() => xChannelKey.value === "alpha");
const yIsAlpha = computed(() => yChannelKey.value === "alpha");
const xConfig = computed(() => xIsAlpha.value ? ALPHA_CONFIG : getChannelConfig(props.colorSpace, xChannelKey.value));
const yConfig = computed(() => yIsAlpha.value ? ALPHA_CONFIG : getChannelConfig(props.colorSpace, yChannelKey.value));

const minX = computed(() => xConfig.value?.min ?? 0);
const maxX = computed(() => xConfig.value?.max ?? 100);
const minY = computed(() => yConfig.value?.min ?? 0);
const maxY = computed(() => yConfig.value?.max ?? 100);
const stepX = computed(() => xConfig.value?.step ?? 1);
const stepY = computed(() => yConfig.value?.step ?? 1);

// Parse incoming modelValue to Color
function parseColor(v: Color | string | null | undefined): Color | undefined {
  if (!v) return undefined;
  if (v instanceof Color) return v;
  return Color.parse(v) ?? undefined;
}

// Internal Color ref
const colorRef = shallowRef<Color | undefined>(parseColor(props.modelValue ?? props.defaultValue));

// Sync from external modelValue changes
watch(() => props.modelValue, (val) => {
  const parsed = parseColor(val);
  if (parsed) colorRef.value = parsed;
});

// Convert Color to display values for the internal slider
function colorToDisplayValues(color: Color | undefined): number[][] {
  if (!color || !xConfig.value || !yConfig.value) return [[minX.value, minY.value]];
  const converted = color.to(props.colorSpace);
  const rawX = xIsAlpha.value ? color.alpha : converted.get(xChannelKey.value);
  const rawY = yIsAlpha.value ? color.alpha : converted.get(yChannelKey.value);
  return [[nativeToDisplay(xConfig.value, rawX), nativeToDisplay(yConfig.value, rawY)]];
}

// Internal numeric model for the slider mechanics
const internalValue = ref<number[][]>(colorToDisplayValues(colorRef.value));

// Sync Color → internal numeric values (also when channels change)
watch([colorRef, xChannelKey, yChannelKey], ([color]) => {
  const newVals = colorToDisplayValues(color);
  // Only update if significantly different to avoid feedback loops
  const cur = internalValue.value[0];
  if (cur && Math.abs((cur[0] ?? 0) - (newVals[0]?.[0] ?? 0)) < 0.001 && Math.abs((cur[1] ?? 0) - (newVals[0]?.[1] ?? 0)) < 0.001) return;
  internalValue.value = newVals;
});

// Rebuild Color from numeric display values
function displayValuesToColor(vals: number[][]): Color | undefined {
  if (!vals[0] || !colorRef.value || !xConfig.value || !yConfig.value) return undefined;
  const nativeX = displayToNative(xConfig.value, vals[0][0] ?? 0);
  const nativeY = displayToNative(yConfig.value, vals[0][1] ?? 0);
  const channelUpdates: Record<string, number> = {};
  if (!xIsAlpha.value) channelUpdates[xChannelKey.value] = nativeX;
  if (!yIsAlpha.value) channelUpdates[yChannelKey.value] = nativeY;
  let result = colorRef.value.with({ space: props.colorSpace, ...channelUpdates });
  if (xIsAlpha.value) result = result.withAlpha(nativeX);
  if (yIsAlpha.value) result = result.withAlpha(nativeY);
  return result;
}

const currentModelValue = computed(() => Array.isArray(internalValue.value) ? [...internalValue.value] : []);

const valueIndexToChangeRef = ref(0);
const valuesBeforeSlideStartRef = ref(currentModelValue.value);
const rectRef = ref<DOMRect>();
const offsetPosition = ref<{ x: number; y: number }>();

// Determine axis directions
const isSlidingFromLeft = computed(() => {
  return (dir.value !== "rtl" && !props.invertedX) || (dir.value !== "ltr" && props.invertedX);
});
const isSlidingFromTop = computed(() => !props.invertedY);

function getPointFromPointerEvent(event: PointerEvent, slideStart?: boolean): number[] {
  const rect = rectRef.value || currentElement.value.getBoundingClientRect();
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
    internalValue.value = nextValues;

    // Rebuild and emit Color
    const newColor = displayValuesToColor(nextValues);
    if (newColor) {
      colorRef.value = newColor;
      emits("update:modelValue", newColor);
      emits("update:color", newColor);
      emits("change", newColor);
      if (commit) emits("changeEnd", newColor);
    }
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

const thumbRef = ref<HTMLElement | undefined>();
const isDragging = ref(false);

provideColorAreaRootContext({
  modelValue: internalValue,
  currentModelValue,
  valueIndexToChangeRef,
  thumbRef,
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
      @keydown="(event: KeyboardEvent) => {
        if (disabled) return;
        if (event.key === 'Home') { handleBoundaryKey('x', minX); event.preventDefault(); }
        else if (event.key === 'End') { handleBoundaryKey('x', maxX); event.preventDefault(); }
        else if (event.key === 'PageUp') { handleBoundaryKey('y', minY); event.preventDefault(); }
        else if (event.key === 'PageDown') { handleBoundaryKey('y', maxY); event.preventDefault(); }
        else if (PAGE_KEYS.concat(ARROW_KEYS).includes(event.key)) { handleStepKeyDown(event); event.preventDefault(); }
      }"
      @pointerdown="(event: PointerEvent) => {
        if (disabled) return;
        const target = event.target as HTMLElement;
        target.setPointerCapture(event.pointerId);
        event.preventDefault();
        if (thumbRef && thumbRef.contains(target)) {
          thumbRef.focus();
        }
        else {
          valuesBeforeSlideStartRef = currentModelValue;
          handleSlideStart(event);
        }
      }"
      @pointermove="(event: PointerEvent) => {
        if (disabled) return;
        const target = event.target as HTMLElement;
        if (target.hasPointerCapture(event.pointerId)) handleSlideMove(event);
      }"
      @pointerup="(event: PointerEvent) => {
        if (disabled) return;
        const target = event.target as HTMLElement;
        if (target.hasPointerCapture(event.pointerId)) {
          target.releasePointerCapture(event.pointerId);
          handleSlideEnd();
        }
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
