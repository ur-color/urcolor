<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, useDirection, useForwardExpose, VisuallyHidden } from "reka-ui";
import { computed, ref, shallowRef, toRefs, watch } from "vue";
import { Color } from "internationalized-color";
import { colorSpaces, getChannelConfig, displayToCulori, culoriToDisplay, type ChannelConfig } from "@urcolor/core";
import { triangleVertices, clampToTriangle, barycentricCoords, type Point } from "@urcolor/core";

type Direction = "ltr" | "rtl";

export interface ColorTriangleRootProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  name?: string | undefined;
  required?: boolean;
  modelValue?: Color | string | null;
  defaultValue?: Color | string;
  disabled?: boolean;
  dir?: Direction;
  colorSpace?: string;
  channelX?: string;
  channelY?: string;
  channelZ?: string;
  rotation?: number;
}

export type ColorTriangleRootEmits = {
  "update:modelValue": [payload: Color | undefined];
  "valueCommit": [payload: Color];
};

export interface ColorTriangleRootContext {
  disabled: Ref<boolean>;
  colorSpace: Ref<string>;
  xChannelKey: Ref<string>;
  yChannelKey: Ref<string>;
  zChannelKey: Ref<string | undefined>;
  colorRef: Readonly<Ref<Color | undefined>>;
  currentXValue: Ref<number>;
  currentYValue: Ref<number>;
  currentZValue: Ref<number>;
  xMin: Ref<number>;
  xMax: Ref<number>;
  yMin: Ref<number>;
  yMax: Ref<number>;
  zMin: Ref<number>;
  zMax: Ref<number>;
  isThreeChannel: Ref<boolean>;
  rotation: Ref<number>;
  vertices: Ref<[Point, Point, Point]>;
  dir: Ref<Direction>;
}

export const [injectColorTriangleRootContext, provideColorTriangleRootContext]
  = createContext<ColorTriangleRootContext>("ColorTriangleRoot");
</script>

<script setup lang="ts">
import { Primitive } from "reka-ui";
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ColorTriangleRootProps>(), {
  disabled: false,
  defaultValue: "hsl(0, 100%, 50%)",
  colorSpace: "hsv",
  rotation: 0,
  as: "span",
});
const emits = defineEmits<ColorTriangleRootEmits>();

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
const xChannelKey = computed(() => props.channelX ?? spaceConfig.value?.channels[1]?.key ?? "s");
const yChannelKey = computed(() => props.channelY ?? spaceConfig.value?.channels[2]?.key ?? "v");
const xIsAlpha = computed(() => xChannelKey.value === "alpha");
const yIsAlpha = computed(() => yChannelKey.value === "alpha");
const xConfig = computed(() => xIsAlpha.value ? ALPHA_CONFIG : getChannelConfig(props.colorSpace, xChannelKey.value));
const yConfig = computed(() => yIsAlpha.value ? ALPHA_CONFIG : getChannelConfig(props.colorSpace, yChannelKey.value));

const zChannelKey = computed(() => props.channelZ);
const zIsAlpha = computed(() => zChannelKey.value === "alpha");
const zConfig = computed(() => zChannelKey.value ? (zIsAlpha.value ? ALPHA_CONFIG : getChannelConfig(props.colorSpace, zChannelKey.value)) : undefined);
const isThreeChannel = computed(() => zChannelKey.value != null);

const xMin = computed(() => xConfig.value?.min ?? 0);
const xMax = computed(() => xConfig.value?.max ?? 100);
const xStep = computed(() => xConfig.value?.step ?? 1);
const yMin = computed(() => yConfig.value?.min ?? 0);
const yMax = computed(() => yConfig.value?.max ?? 100);
const yStep = computed(() => yConfig.value?.step ?? 1);
const zMin = computed(() => zConfig.value?.min ?? 0);
const zMax = computed(() => zConfig.value?.max ?? 100);
const zStep = computed(() => zConfig.value?.step ?? 1);

// Triangle vertices in normalized 0-1 space
const vertices = computed(() => triangleVertices(1, 1, props.rotation));

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

function colorToDisplayValues(color: Color | undefined): { x: number; y: number; z: number } {
  if (!color || !xConfig.value || !yConfig.value) return { x: xMin.value, y: yMin.value, z: zMin.value };
  const converted = color.to(props.colorSpace);
  if (!converted) return { x: xMin.value, y: yMin.value, z: zMin.value };
  const rawX = xIsAlpha.value ? (color.alpha ?? 1) : converted.get(xChannelKey.value, 0);
  const rawY = yIsAlpha.value ? (color.alpha ?? 1) : converted.get(yChannelKey.value, 0);
  const rawZ = zChannelKey.value ? (zIsAlpha.value ? (color.alpha ?? 1) : converted.get(zChannelKey.value, 0)) : 0;
  return {
    x: culoriToDisplay(xConfig.value, rawX),
    y: culoriToDisplay(yConfig.value, rawY),
    z: zConfig.value ? culoriToDisplay(zConfig.value, rawZ) : zMin.value,
  };
}

const initValues = colorToDisplayValues(colorRef.value);
const currentXValue = ref(initValues.x);
const currentYValue = ref(initValues.y);
const currentZValue = ref(initValues.z);

watch([colorRef, xChannelKey, yChannelKey, zChannelKey], ([color]) => {
  const newVals = colorToDisplayValues(color);
  if (Math.abs(currentXValue.value - newVals.x) > 0.001) currentXValue.value = newVals.x;
  if (Math.abs(currentYValue.value - newVals.y) > 0.001) currentYValue.value = newVals.y;
  if (Math.abs(currentZValue.value - newVals.z) > 0.001) currentZValue.value = newVals.z;
});

function displayValuesToColor(xVal: number, yVal: number, zVal?: number): Color | undefined {
  if (!colorRef.value || !xConfig.value || !yConfig.value) return undefined;
  const culoriX = displayToCulori(xConfig.value, xVal);
  const culoriY = displayToCulori(yConfig.value, yVal);
  const updates: Record<string, number> = {};
  if (!xIsAlpha.value) updates[xChannelKey.value] = culoriX;
  if (!yIsAlpha.value) updates[yChannelKey.value] = culoriY;
  if (zChannelKey.value && zConfig.value && zVal != null) {
    const culoriZ = displayToCulori(zConfig.value, zVal);
    if (!zIsAlpha.value) updates[zChannelKey.value] = culoriZ;
  }
  let result = colorRef.value.set({ mode: props.colorSpace, ...updates });
  if (xIsAlpha.value) result = result.set({ alpha: culoriX });
  if (yIsAlpha.value) result = result.set({ alpha: culoriY });
  if (zChannelKey.value && zConfig.value && zVal != null && zIsAlpha.value) {
    result = result.set({ alpha: displayToCulori(zConfig.value, zVal) });
  }
  return result;
}

function snap(value: number, min: number, max: number, step: number): number {
  const decimals = (String(step).split(".")[1] || "").length;
  const snapped = Math.round((value - min) / step) * step + min;
  const factor = 10 ** decimals;
  return Math.max(min, Math.min(max, Math.round(snapped * factor) / factor));
}

const valueBeforeSlide = ref({ x: currentXValue.value, y: currentYValue.value, z: currentZValue.value });
const rectRef = ref<DOMRect>();

function getValuesFromPointer(event: PointerEvent): { x: number; y: number; z?: number } {
  const rect = rectRef.value || currentElement.value.getBoundingClientRect();
  rectRef.value = rect;

  const nx = (event.clientX - rect.left) / rect.width;
  const ny = (event.clientY - rect.top) / rect.height;

  const [v0, v1, v2] = vertices.value;
  const clamped = clampToTriangle(nx, ny, v0, v1, v2);

  const { u, v, w } = barycentricCoords(clamped.x, clamped.y, v0, v1, v2);
  const cu = Math.max(0, u), cv = Math.max(0, v), cw = Math.max(0, w);
  const sum = cu + cv + cw;
  const nu = cu / sum, nv = cv / sum, nw = cw / sum;

  if (isThreeChannel.value) {
    // 3-channel: v0→(xMax,yMin,zMin), v1→(xMin,yMax,zMin), v2→(xMin,yMin,zMax)
    const xVal = nu * xMax.value + (1 - nu) * xMin.value;
    const yVal = nv * yMax.value + (1 - nv) * yMin.value;
    const zVal = nw * zMax.value + (1 - nw) * zMin.value;
    return { x: xVal, y: yVal, z: zVal };
  }

  // 2-channel: v0→(xMax,yMax), v1→(xMin,yMax), v2→(xMin,yMin)
  const xVal = nu * xMax.value + nv * xMin.value + nw * xMin.value;
  const yVal = nu * yMax.value + nv * yMax.value + nw * yMin.value;
  return { x: xVal, y: yVal };
}

function updateValues(xVal: number, yVal: number, commit = false, zVal?: number) {
  const snappedX = snap(xVal, xMin.value, xMax.value, xStep.value);
  const snappedY = snap(yVal, yMin.value, yMax.value, yStep.value);
  const snappedZ = zVal != null ? snap(zVal, zMin.value, zMax.value, zStep.value) : undefined;

  currentXValue.value = snappedX;
  currentYValue.value = snappedY;
  if (snappedZ != null) currentZValue.value = snappedZ;

  const newColor = displayValuesToColor(snappedX, snappedY, snappedZ);
  if (newColor) {
    colorRef.value = newColor;
    emits("update:modelValue", newColor);
    if (commit) emits("valueCommit", newColor);
  }
}

function handlePointerDown(event: PointerEvent) {
  if (props.disabled) return;
  const target = event.target as HTMLElement;
  target.setPointerCapture(event.pointerId);
  event.preventDefault();
  valueBeforeSlide.value = { x: currentXValue.value, y: currentYValue.value, z: currentZValue.value };
  const vals = getValuesFromPointer(event);
  updateValues(vals.x, vals.y, false, vals.z);
}

function handlePointerMove(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.hasPointerCapture(event.pointerId)) return;
  const vals = getValuesFromPointer(event);
  updateValues(vals.x, vals.y, false, vals.z);
}

function handlePointerUp(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.hasPointerCapture(event.pointerId)) return;
  target.releasePointerCapture(event.pointerId);
  rectRef.value = undefined;
  const prev = valueBeforeSlide.value;
  if (prev.x !== currentXValue.value || prev.y !== currentYValue.value || prev.z !== currentZValue.value) {
    if (colorRef.value) emits("valueCommit", colorRef.value);
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled) return;
  let xOffset = 0;
  let yOffset = 0;
  const multiplier = event.shiftKey ? 10 : 1;

  if (event.key === "ArrowRight") xOffset = xStep.value * multiplier;
  else if (event.key === "ArrowLeft") xOffset = -xStep.value * multiplier;
  else if (event.key === "ArrowUp") yOffset = -yStep.value * multiplier;
  else if (event.key === "ArrowDown") yOffset = yStep.value * multiplier;
  else if (event.key === "PageUp") yOffset = -yStep.value * 10;
  else if (event.key === "PageDown") yOffset = yStep.value * 10;
  else if (event.key === "Home") {
    updateValues(xMin.value, yMin.value, true);
    event.preventDefault();
    return;
  }
  else if (event.key === "End") {
    updateValues(xMax.value, yMax.value, true);
    event.preventDefault();
    return;
  }
  else return;

  event.preventDefault();
  updateValues(currentXValue.value + xOffset, currentYValue.value + yOffset, true);
}

const isFormControl = computed(() => currentElement.value ? Boolean(currentElement.value.closest("form")) : false);

provideColorTriangleRootContext({
  disabled,
  colorSpace: computed(() => props.colorSpace),
  xChannelKey,
  yChannelKey,
  zChannelKey,
  colorRef,
  currentXValue,
  currentYValue,
  currentZValue,
  xMin,
  xMax,
  yMin,
  yMax,
  zMin,
  zMax,
  isThreeChannel,
  rotation: computed(() => props.rotation),
  vertices,
  dir,
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
