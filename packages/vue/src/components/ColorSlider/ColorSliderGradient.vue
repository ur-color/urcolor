<script lang="ts">
import type { PrimitiveProps } from "../../primitives/types";
import type { SpaceId } from "@urcolor/core";
import type { GradientRenderer } from "@urcolor/shared";

export interface ColorSliderGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /**
   * Which painter to use.
   * - `"auto"` (default) — CSS when an exact recipe exists, canvas otherwise
   * - `"css"` — force CSS; falls back to the canvas with a dev warning if none exists
   * - `"canvas"` — force the canvas painter
   */
  renderer?: GradientRenderer;
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
import { cssLinearStops, defaultStepsFor, drawLinearGradient, gradientOpacity, sliderStops, SLIDER_CANVAS_STEPS } from "@urcolor/shared";
import { useGradientCanvas } from "../../shared/useGradientCanvas";
import { CSS_GRADIENT_ROOT_STYLE, cssLayerStyle, useCssGradient } from "../../shared/useCssGradient";
import { CHECKERBOARD_STYLE } from "../../shared/checkerboard";
import { injectColorSliderRootContext } from "./ColorSliderRoot.vue";

const props = withDefaults(defineProps<ColorSliderGradientProps>(), {
  as: "span",
  renderer: "auto",
  channelOverrides: () => ({ alpha: 1 }),
});

useForwardExpose();

const rootContext = injectColorSliderRootContext();

// Resolve effective angle: use prop if provided, otherwise 90 for vertical orientation, 0 for horizontal
const effectiveAngle = computed(() => {
  if (props.angle !== undefined) return props.angle;
  return rootContext.orientation.value === "vertical" ? 90 : 0;
});

const isAlphaChannel = computed(() => rootContext.channel.value === "alpha");

const canvasOpacity = computed(() => {
  const color = rootContext.colorRef.value;
  if (!color) return 1;
  return gradientOpacity(color, rootContext.channel.value, props.channelOverrides);
});

/**
 * The stop list both painters draw, differing only in how many stops they can
 * hold: the shader has 16 uniform slots, so the WebGL path asks for
 * `SLIDER_CANVAS_STEPS`, while the CSS path has no such ceiling and asks for
 * `defaultStepsFor(…)` instead — 36 across a hue sweep, where banding between
 * sRGB-lerped stops is visible and 12 is not enough.
 */
function resolveColors(steps: number): ReturnType<typeof sliderStops> {
  const color = rootContext.colorRef.value;
  if (!color) return null;

  return sliderStops({
    color,
    colorSpace: rootContext.colorSpace.value,
    channel: rootContext.channel.value,
    colors: props.colors,
    channelOverrides: props.channelOverrides,
    interpolationSpace: props.interpolationSpace,
    steps,
    mirrored: rootContext.inverted.value,
  });
}

/**
 * Stops for the CSS path. `interpolationSpace` does not force the canvas here:
 * a 1D sweep is fully expressible as stops, and `resolveColors` already
 * densifies to 32 of them computed in that space.
 */
const cssLayers = useCssGradient({
  renderer: () => props.renderer,
  name: "ColorSliderGradient",
  build: () => {
    const colors = resolveColors(
      props.colors ? SLIDER_CANVAS_STEPS : defaultStepsFor(rootContext.colorSpace.value, rootContext.channel.value),
    );
    if (!colors) return null;
    return cssLinearStops(colors, effectiveAngle.value);
  },
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

function paint(canvas: HTMLCanvasElement) {
  const colors = resolveColors(SLIDER_CANVAS_STEPS);
  if (!colors) return;
  drawLinearGradient(canvas, colors, effectiveAngle.value, isAlphaChannel.value);
}

useGradientCanvas({
  canvas: canvasRef,
  // Everything `resolveColors` and `paint` read. The colour, channel and space
  // stand in for the stop list the old `autoColors` computed held: the stops
  // are derived on demand now, so the sources are their inputs.
  sources: () => [
    props.colors,
    effectiveAngle.value,
    rootContext.inverted.value,
    props.interpolationSpace,
    props.channelOverrides,
    rootContext.colorRef.value,
    rootContext.channel.value,
    rootContext.colorSpace.value,
  ],
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
    :style="CHECKERBOARD_STYLE"
  >
    <span
      v-if="cssLayers"
      :style="{ ...CSS_GRADIENT_ROOT_STYLE, opacity: canvasOpacity }"
    >
      <span
        v-for="(layer, i) in cssLayers"
        :key="i"
        :style="cssLayerStyle(layer)"
      />
    </span>
    <canvas
      v-else
      ref="canvasRef"
      :style="{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', opacity: canvasOpacity }"
    />
    <slot />
  </Primitive>
</template>
