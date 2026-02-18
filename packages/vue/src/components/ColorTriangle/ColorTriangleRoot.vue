<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, useDirection, useForwardExpose, VisuallyHidden } from "reka-ui";
import { computed, ref, shallowRef, toRefs, watch } from "vue";
import { Color } from "internationalized-color";
import { colorSpaces, getChannelConfig, displayToCulori, culoriToDisplay, type ChannelConfig, triangleVertices, clampToTriangle, barycentricCoords, pointInTriangle, insetTriangle, type Point } from "@urcolor/core";

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
  orientation?: "vertical" | "horizontal";
  inverted?: boolean;
  thumbAlignment?: "contain" | "overflow";
}

export type ColorTriangleRootEmits = {
  "update:modelValue": [payload: Color | undefined];
  "valueCommit": [payload: Color];
};

export type ActiveDirection = "x" | "y" | "z";

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
  orientation: Ref<"vertical" | "horizontal">;
  dir: Ref<Direction>;
  activeDirection: Ref<ActiveDirection>;
  thumbXElement: Ref<HTMLElement | undefined>;
  thumbYElement: Ref<HTMLElement | undefined>;
  thumbZElement: Ref<HTMLElement | undefined>;
  inverted: Ref<boolean>;
  isDragging: Ref<boolean>;
  thumbAlignment: Ref<"contain" | "overflow">;
  thumbElement: Ref<HTMLElement | undefined>;
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
  orientation: "vertical",
  inverted: false,
  thumbAlignment: "overflow",
  as: "span",
});
const emits = defineEmits<ColorTriangleRootEmits>();

defineSlots<{
  default?: (props: { modelValue: Color | undefined }) => any;
}>();

const { disabled, thumbAlignment, dir: propDir } = toRefs(props);
const thumbElement = ref<HTMLElement>();
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
const vertices = computed(() => {
  const [v0, v1, v2] = triangleVertices(1, 1, props.rotation);
  return props.inverted ? [v0, v2, v1] as [Point, Point, Point] : [v0, v1, v2] as [Point, Point, Point];
});

const containVertices = computed<[Point, Point, Point]>(() => {
  if (thumbAlignment.value !== "contain" || !thumbElement.value || !currentElement.value) return vertices.value;
  const containerSize = Math.min(currentElement.value.clientWidth, currentElement.value.clientHeight);
  if (containerSize <= 0) return vertices.value;
  const thumbW = thumbElement.value.clientWidth;
  const thumbH = thumbElement.value.clientHeight;
  const inset = Math.max(thumbW, thumbH) / 2 / containerSize;
  if (inset <= 0) return vertices.value;
  const [v0, v1, v2] = vertices.value;
  return insetTriangle(v0, v1, v2, inset);
});

const clipPathStyle = computed(() => {
  const [v0, v1, v2] = vertices.value;
  const pts = [v0, v1, v2].map(p => `${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%`).join(", ");
  return { clipPath: `polygon(${pts})` };
});

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

const activeDirection = ref<ActiveDirection>("x");
const thumbXElement = ref<HTMLElement>();
const thumbYElement = ref<HTMLElement>();
const thumbZElement = ref<HTMLElement>();
const isDragging = ref(false);

const valueBeforeSlide = ref({ x: currentXValue.value, y: currentYValue.value, z: currentZValue.value });
const rectRef = ref<DOMRect>();

function getValuesFromPointer(event: PointerEvent): { x: number; y: number; z?: number } {
  const rect = rectRef.value || currentElement.value.getBoundingClientRect();
  rectRef.value = rect;

  const nx = (event.clientX - rect.left) / rect.width;
  const ny = (event.clientY - rect.top) / rect.height;

  const [v0, v1, v2] = containVertices.value;
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

  // Ignore clicks outside the triangle
  const rect = currentElement.value.getBoundingClientRect();
  const nx = (event.clientX - rect.left) / rect.width;
  const ny = (event.clientY - rect.top) / rect.height;
  const [hv0, hv1, hv2] = vertices.value;
  if (!pointInTriangle(nx, ny, hv0, hv1, hv2)) return;

  target.setPointerCapture(event.pointerId);
  event.preventDefault();

  if (thumbXElement.value && (target === thumbXElement.value || thumbXElement.value.contains(target))) {
    activeDirection.value = "x";
    thumbXElement.value.focus();
  } else if (thumbYElement.value && (target === thumbYElement.value || thumbYElement.value.contains(target))) {
    activeDirection.value = "y";
    thumbYElement.value.focus();
  } else if (thumbZElement.value && (target === thumbZElement.value || thumbZElement.value.contains(target))) {
    activeDirection.value = "z";
    thumbZElement.value.focus();
  } else {
    // Clicked on triangle surface — focus the X thumb by default
    activeDirection.value = "x";
    thumbXElement.value?.focus();
  }

  isDragging.value = true;
  valueBeforeSlide.value = { x: currentXValue.value, y: currentYValue.value, z: currentZValue.value };
  const vals = getValuesFromPointer(event);
  updateValues(vals.x, vals.y, false, vals.z);
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
    if (lastPointerPosition.value) {
      const dx = Math.abs(clientX - lastPointerPosition.value.x);
      const dy = Math.abs(clientY - lastPointerPosition.value.y);
      const newDirection = dx >= dy ? "x" : "y";
      activeDirection.value = newDirection;
    }
    lastPointerPosition.value = { x: clientX, y: clientY };
    const vals = getValuesFromPointer({ clientX, clientY, pointerId } as PointerEvent);
    updateValues(vals.x, vals.y, false, vals.z);
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
  if (prev.x !== currentXValue.value || prev.y !== currentYValue.value || prev.z !== currentZValue.value) {
    if (colorRef.value) emits("valueCommit", colorRef.value);
  }
}

function channelsToBary(): { u: number; v: number; w: number } {
  const xRange = xMax.value - xMin.value;
  const yRange = yMax.value - yMin.value;

  if (isThreeChannel.value) {
    // 3-channel: v0→(xMax,yMin,zMin), v1→(xMin,yMax,zMin), v2→(xMin,yMin,zMax)
    const u = xRange > 0 ? (currentXValue.value - xMin.value) / xRange : 0;
    const v = yRange > 0 ? (currentYValue.value - yMin.value) / yRange : 0;
    const w = Math.max(0, 1 - u - v);
    const sum = u + v + w;
    return sum > 0 ? { u: u / sum, v: v / sum, w: w / sum } : { u: 1 / 3, v: 1 / 3, w: 1 / 3 };
  }

  // 2-channel: v0→(xMax,yMax), v1→(xMin,yMax), v2→(xMin,yMin)
  // x = u*xMax + (1-u)*xMin → u = (x - xMin) / xRange
  // y = (1-w)*yMax + w*yMin → w = (yMax - y) / yRange
  const u = xRange > 0 ? (currentXValue.value - xMin.value) / xRange : 0;
  const w = yRange > 0 ? (yMax.value - currentYValue.value) / yRange : 0;
  const v = Math.max(0, 1 - u - w);
  const sum = u + v + w;
  return sum > 0 ? { u: u / sum, v: v / sum, w: w / sum } : { u: 1 / 3, v: 1 / 3, w: 1 / 3 };
}

function baryToChannels(u: number, v: number, w: number): { x: number; y: number; z?: number } {
  if (isThreeChannel.value) {
    return {
      x: u * xMax.value + (1 - u) * xMin.value,
      y: v * yMax.value + (1 - v) * yMin.value,
      z: w * zMax.value + (1 - w) * zMin.value,
    };
  }
  return {
    x: u * xMax.value + (1 - u) * xMin.value,
    y: (1 - w) * yMax.value + w * yMin.value,
  };
}

function handleKeyDown3Channel(event: KeyboardEvent) {
  const step = 0.05;
  const multiplier = event.shiftKey ? 4 : 1;

  // Determine delta for the focused channel
  let channelDelta = 0;
  switch (event.key) {
    case "ArrowUp":
    case "ArrowRight":
      channelDelta = step * multiplier;
      break;
    case "ArrowDown":
    case "ArrowLeft":
      channelDelta = -step * multiplier;
      break;
    case "PageUp":
      channelDelta = step * 4;
      break;
    case "PageDown":
      channelDelta = -step * 4;
      break;
    case "Home": {
      // Jump to this channel's vertex (max this, min others)
      const dir = activeDirection.value;
      const u = dir === "x" ? 1 : 0;
      const v = dir === "y" ? 1 : 0;
      const w = dir === "z" ? 1 : 0;
      const vals = baryToChannels(u, v, w);
      updateValues(vals.x, vals.y, true, vals.z);
      event.preventDefault();
      return;
    }
    case "End": {
      // Jump to center (equal distribution)
      const vals = baryToChannels(1 / 3, 1 / 3, 1 / 3);
      updateValues(vals.x, vals.y, true, vals.z);
      event.preventDefault();
      return;
    }
    default:
      return;
  }

  event.preventDefault();

  const bary = channelsToBary();
  let newU = bary.u, newV = bary.v, newW = bary.w;
  const ad = activeDirection.value;

  // Get current value of focused component and apply delta
  const focused = ad === "x" ? newU : ad === "y" ? newV : newW;
  const newFocused = Math.max(0, Math.min(1, focused + channelDelta));
  const actualDelta = newFocused - focused;

  // Save originals before mutation
  const origU = newU, origV = newV, origW = newW;

  if (ad === "x") newU = newFocused;
  else if (ad === "y") newV = newFocused;
  else newW = newFocused;

  // Distribute the opposite delta proportionally to the other two
  function redistribute(a: number, b: number, delta: number): [number, number] {
    const sum = a + b;
    if (sum > 0) {
      return [a - delta * (a / sum), b - delta * (b / sum)];
    }
    const half = -delta / 2;
    return [half, half];
  }

  if (ad === "x") {
    [newV, newW] = redistribute(origV, origW, actualDelta);
  } else if (ad === "y") {
    [newU, newW] = redistribute(origU, origW, actualDelta);
  } else {
    [newU, newV] = redistribute(origU, origV, actualDelta);
  }

  // Clamp and normalize
  newU = Math.max(0, newU);
  newV = Math.max(0, newV);
  newW = Math.max(0, newW);
  const sum = newU + newV + newW;
  if (sum > 0) { newU /= sum; newV /= sum; newW /= sum; }

  const vals = baryToChannels(newU, newV, newW);
  updateValues(vals.x, vals.y, true, vals.z);
}

function handleKeyDown2Channel(event: KeyboardEvent) {
  const multiplier = event.shiftKey ? 4 : 1;
  let newX = currentXValue.value;
  let newY = currentYValue.value;

  let targetedY = false;

  switch (event.key) {
    case "ArrowRight":
      newY = Math.min(yMax.value, newY + yStep.value * multiplier);
      targetedY = true;
      break;
    case "ArrowLeft":
      newY = Math.max(yMin.value, newY - yStep.value * multiplier);
      targetedY = true;
      break;
    case "ArrowUp":
      newX = Math.min(xMax.value, newX + xStep.value * multiplier);
      break;
    case "ArrowDown":
      newX = Math.max(xMin.value, newX - xStep.value * multiplier);
      break;
    case "PageUp":
      newX = xMax.value;
      newY = yMax.value;
      break;
    case "PageDown":
      newX = xMin.value;
      newY = yMin.value;
      break;
    case "Home":
      newX = xMax.value;
      newY = yMax.value;
      break;
    case "End":
      newX = xMin.value;
      newY = yMin.value;
      break;
    default:
      return;
  }

  // Clamp to triangle bounds: u + w <= 1 (v >= 0)
  const xRange = xMax.value - xMin.value;
  const yRange = yMax.value - yMin.value;
  if (xRange > 0 && yRange > 0) {
    const u = (newX - xMin.value) / xRange;
    const w = (yMax.value - newY) / yRange;
    if (u + w > 1) {
      if (targetedY) {
        newX = xMin.value + (1 - w) * xRange;
      } else {
        newY = yMax.value - (1 - u) * yRange;
      }
    }
  }

  event.preventDefault();
  updateValues(newX, newY, true);
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled) return;
  if (isThreeChannel.value) {
    handleKeyDown3Channel(event);
  } else {
    handleKeyDown2Channel(event);
  }
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
  orientation: computed(() => props.orientation!),
  vertices,
  dir,
  activeDirection,
  thumbXElement,
  thumbYElement,
  thumbZElement,
  inverted: computed(() => props.inverted),
  isDragging,
  thumbAlignment,
  thumbElement,
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
    :style="clipPathStyle"
    :data-disabled="disabled ? '' : undefined"
    data-color-triangle-root
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
