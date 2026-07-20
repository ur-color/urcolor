<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
import type { SpaceId } from "@urcolor/core";

export interface ColorSliderGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** Array of color stops. When omitted, auto-computes from the slider's channel and current color. */
  colors?: string[];
  /** Rotation angle in degrees (0 = left-to-right, 90 = top-to-bottom). Values are normalized to 0–360. When using vertical orientation, defaults to 90. */
  angle?: number;
  /** When set to a non-RGB color space, interpolates stops in that space for perceptual accuracy. */
  interpolationSpace?: SpaceId;
  /**
   * Lock specific channels to fixed values in the gradient.
   * - `{ alpha: 1 }` (default) — lock alpha to 1
   * - `{ s: 1, v: 1 }` — lock saturation and value
   * - `false` — no overrides, gradient reflects all channels from current color
   */
  channelOverrides?: Record<string, number> | false;
}
</script>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useForwardExpose, Primitive } from "reka-ui";
import { Color } from "@urcolor/core";
import { drawLinearGradient, interpolateStops, getChannelConfig } from "@urcolor/core";
import { applyChannelOverrides, useGradientCanvas } from "../../shared/useGradientCanvas";
import { CHECKERBOARD_BACKGROUND } from "../../shared/checkerboard";
import { injectColorSliderRootContext } from "./ColorSliderRoot.vue";

const props = withDefaults(defineProps<ColorSliderGradientProps>(), {
  as: "span",
  channelOverrides: () => ({ alpha: 1 }),
});

useForwardExpose();

const rootContext = injectColorSliderRootContext();

// Resolve effective angle: use prop if provided, otherwise 90 for vertical orientation, 0 for horizontal
const effectiveAngle = computed(() => {
  if (props.angle !== undefined) return props.angle;
  return rootContext.orientation.value === "vertical" ? 90 : 0;
});

// Mirror the gradient when inverted: mirrorX for horizontal, mirrorY for vertical
const effectiveMirrorX = computed(() => rootContext.orientation.value === "horizontal" && rootContext.inverted.value);
const effectiveMirrorY = computed(() => rootContext.orientation.value === "vertical" && rootContext.inverted.value);

const isAlphaChannel = computed(() => rootContext.channel.value === "alpha");

const canvasOpacity = computed(() => {
  const overrides = props.channelOverrides;
  // If overrides is false or doesn't include alpha, reflect color's alpha (unless this IS the alpha channel)
  if (isAlphaChannel.value) return 1;
  if (overrides === false || (typeof overrides === "object" && overrides.alpha === undefined)) {
    return rootContext.colorRef.value?.alpha ?? 1;
  }
  return 1;
});

// Auto-compute gradient colors from slider context when `colors` prop is not provided
const autoColors = computed<Color[] | null>(() => {
  if (props.colors) return null; // User provided explicit colors

  const color = rootContext.colorRef.value;
  const channel = rootContext.channel.value;
  const colorSpace = rootContext.colorSpace.value;
  if (!color) return null;

  const overrides = props.channelOverrides;

  if (isAlphaChannel.value) {
    // Alpha slider: gradient from transparent to opaque. Any `alpha` override
    // in the map is irrelevant here — alpha is the axis, so both endpoints
    // overwrite it.
    const baseColor = applyChannelOverrides(color, colorSpace, overrides);
    const transparent = baseColor.withAlpha(0);
    const opaque = baseColor.withAlpha(1);
    return [transparent, opaque];
  }

  const cfg = getChannelConfig(colorSpace, channel);
  if (!cfg) return null;

  const steps = 12;
  const colors: Color[] = [];
  const cMin = cfg.nativeMin ?? cfg.min;
  const cMax = cfg.nativeMax ?? cfg.max;

  // Apply overrides to the base color
  const baseColor = applyChannelOverrides(color, colorSpace, overrides);

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const val = cMin + t * (cMax - cMin);
    const c = baseColor.with({ space: colorSpace, [channel]: val });
    colors.push(c);
  }
  return colors;
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

function paint(canvas: HTMLCanvasElement) {
  let colors: Color[];

  if (props.colors) {
    // Use explicitly provided color strings
    const parsed = props.colors.map((c: string) => Color.parse(c));
    if (parsed.some((c: Color | null) => !c) || parsed.length < 2) return;
    colors = parsed as Color[];
  } else if (autoColors.value) {
    colors = autoColors.value;
    if (colors.length < 2) return;
  } else {
    return;
  }

  // Mirror at data level (like ColorArea) — reverse the color stops when inverted
  const shouldMirror = effectiveMirrorX.value || effectiveMirrorY.value;
  if (shouldMirror) {
    colors = [...colors].reverse();
  }

  if (props.interpolationSpace) {
    const interpolated = interpolateStops(colors, 32, props.interpolationSpace);
    drawLinearGradient(canvas, interpolated, effectiveAngle.value, isAlphaChannel.value);
  } else {
    drawLinearGradient(canvas, colors, effectiveAngle.value, isAlphaChannel.value);
  }
}

useGradientCanvas({
  canvas: canvasRef,
  sources: () => [props.colors, effectiveAngle.value, effectiveMirrorX.value, effectiveMirrorY.value, props.interpolationSpace, props.channelOverrides, autoColors.value],
  paint,
  isDragging: rootContext.isDragging,
  // Carried over from the pre-refactor watch for fidelity, not because a
  // shallow watch was shown to misbehave: `sources` is a getter, so it already
  // re-runs and returns a fresh array on every trigger regardless of `deep` —
  // `deep` only adds traversal-based tracking of the array's *elements*
  // (`Color` instances, which are not reactive), so it has no reactive
  // dependency left to add. See `useGradientCanvas.test.ts`, "reaches the
  // `deep` option through to the watch" for what is actually pinned here.
  deep: true,
  // drawLinearGradient paints through WebGL.
  usesWebGL: true,
});
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :style="{ background: CHECKERBOARD_BACKGROUND }"
  >
    <canvas
      ref="canvasRef"
      :style="{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', opacity: canvasOpacity }"
    />
    <slot />
  </Primitive>
</template>
