<script lang="ts">
import type { Ref } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { createContext, useDirection, useForwardExpose, VisuallyHidden } from "reka-ui";
import { computed, ref, toRef, toRefs } from "vue";
import { Color, type SpaceId } from "@urcolor/core";
import { colorSpaces, triangleVertices, clampToTriangle, barycentricCoords, pointInTriangle, insetTriangle, type Point } from "@urcolor/core";

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
  colorSpace?: SpaceId;
  xChannel?: string;
  yChannel?: string;
  zChannel?: string;
  rotation?: number;
  orientation?: "vertical" | "horizontal";
  inverted?: boolean;
  thumbAlignment?: "contain" | "overflow";
}

export type ColorTriangleRootEmits = {
  /** Two-way binding for the selected color. */
  "update:modelValue": [payload: Color | undefined];
  /** Fired alongside `update:modelValue` whenever the color changes. */
  "update:color": [payload: Color];
  /** Fired on every value change, whether from pointer, keyboard or model. */
  "change": [payload: Color];
  /** Fired when an interaction that changed the value finishes. */
  "changeEnd": [payload: Color];
};

export interface ColorTriangleRootContext {
  disabled: Ref<boolean>;
  colorSpace: Ref<SpaceId>;
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
import { snapToStep, useFormControl } from "../../shared/utils";
import { useColorChannelModel } from "../../shared/useColorChannelModel";

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

const spaceConfig = computed(() => colorSpaces[props.colorSpace]);
const xChannelKey = computed(() => props.xChannel ?? spaceConfig.value?.channels[1]?.key ?? "s");
const yChannelKey = computed(() => props.yChannel ?? spaceConfig.value?.channels[2]?.key ?? "v");

const zChannelKey = computed(() => props.zChannel);
const isThreeChannel = computed(() => zChannelKey.value != null);

// The z axis is optional, so the channel list is two or three entries long and
// the display values follow it in the same order.
const { colorRef, displayValues, configs, setDisplayValues } = useColorChannelModel({
  colorSpace: toRef(props, "colorSpace"),
  channels: computed(() => zChannelKey.value
    ? [xChannelKey.value, yChannelKey.value, zChannelKey.value]
    : [xChannelKey.value, yChannelKey.value]),
  modelValue: toRef(props, "modelValue"),
  defaultValue: toRef(props, "defaultValue"),
  emit: emits,
});

const xConfig = computed(() => configs.value[0]);
const yConfig = computed(() => configs.value[1]);
const zConfig = computed(() => configs.value[2]);

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

const currentXValue = computed(() => displayValues.value[0] ?? xMin.value);
const currentYValue = computed(() => displayValues.value[1] ?? yMin.value);
const currentZValue = computed(() => displayValues.value[2] ?? zMin.value);

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
  const snappedX = snapToStep(xVal, xMin.value, xMax.value, xStep.value);
  const snappedY = snapToStep(yVal, yMin.value, yMax.value, yStep.value);
  const snappedZ = zVal != null ? snapToStep(zVal, zMin.value, zMax.value, zStep.value) : undefined;

  setDisplayValues(
    isThreeChannel.value
      ? [snappedX, snappedY, snappedZ ?? currentZValue.value]
      : [snappedX, snappedY],
    { commit },
  );
}

/**
 * Write one or more axes, keeping the resulting point inside the triangle.
 *
 * Only the axes present in `partial` are treated as driven; the others are
 * held at their current value and may be adjusted by the in-triangle clamp.
 */
function setChannelValues(partial: { x?: number; y?: number; z?: number }, options: { commit?: boolean } = {}) {
  const hasX = partial.x != null;
  const hasY = partial.y != null;

  let newX = hasX ? snapToStep(partial.x!, xMin.value, xMax.value, xStep.value) : currentXValue.value;
  let newY = hasY ? snapToStep(partial.y!, yMin.value, yMax.value, yStep.value) : currentYValue.value;
  let newZ = partial.z != null ? snapToStep(partial.z, zMin.value, zMax.value, zStep.value) : currentZValue.value;

  const xRange = xMax.value - xMin.value;
  const yRange = yMax.value - yMin.value;
  const zRange = zMax.value - zMin.value;

  if (isThreeChannel.value) {
    // Barycentric simplex: only the ratio between the three channels is
    // meaningful, so renormalise all three back onto u + v + w === 1.
    if (xRange > 0 && yRange > 0 && zRange > 0) {
      const u = Math.max(0, (newX - xMin.value) / xRange);
      const v = Math.max(0, (newY - yMin.value) / yRange);
      const w = Math.max(0, (newZ - zMin.value) / zRange);
      const sum = u + v + w;
      const nu = sum > 0 ? u / sum : 1 / 3;
      const nv = sum > 0 ? v / sum : 1 / 3;
      const nw = sum > 0 ? w / sum : 1 / 3;
      const vals = baryToChannels(nu, nv, nw);
      newX = vals.x;
      newY = vals.y;
      newZ = vals.z ?? newZ;
    }
    updateValues(newX, newY, options.commit, newZ);
    return;
  }

  // 2-channel: the reachable region is the half-simplex u + w <= 1. When a
  // step pushes past the hypotenuse, give way on the axis that was not driven.
  if (xRange > 0 && yRange > 0) {
    const u = (newX - xMin.value) / xRange;
    const w = (yMax.value - newY) / yRange;
    if (u + w > 1) {
      if (hasY && !hasX)
        newX = xMin.value + (1 - w) * xRange;
      else
        newY = yMax.value - (1 - u) * yRange;
    }
  }

  updateValues(newX, newY, options.commit);
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

  thumbElement.value?.focus();

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
    if (colorRef.value) emits("changeEnd", colorRef.value);
  }
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

const STEP_KEY_AXES: Record<string, { axis: "x" | "y" | "z"; sign: number }> = {
  ArrowRight: { axis: "x", sign: 1 },
  ArrowLeft: { axis: "x", sign: -1 },
  ArrowUp: { axis: "y", sign: 1 },
  ArrowDown: { axis: "y", sign: -1 },
  PageUp: { axis: "z", sign: 1 },
  PageDown: { axis: "z", sign: -1 },
};

function stepFor(axis: "x" | "y" | "z"): number {
  if (axis === "x") return xStep.value;
  if (axis === "y") return yStep.value;
  return zStep.value;
}

function currentFor(axis: "x" | "y" | "z"): number {
  if (axis === "x") return currentXValue.value;
  if (axis === "y") return currentYValue.value;
  return currentZValue.value;
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled) return;

  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    setChannelValues({ x: event.key === "Home" ? xMin.value : xMax.value }, { commit: true });
    return;
  }

  const spec = STEP_KEY_AXES[event.key];
  if (!spec) return;
  if (spec.axis === "z" && !isThreeChannel.value) return;

  event.preventDefault();
  const multiplier = event.shiftKey ? 10 : 1;
  const delta = stepFor(spec.axis) * spec.sign * multiplier;
  setChannelValues({ [spec.axis]: currentFor(spec.axis) + delta }, { commit: true });
}

const isFormControl = useFormControl(currentElement);

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
    :aria-disabled="disabled || undefined"
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
