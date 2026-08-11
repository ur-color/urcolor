<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
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
import { Color } from "@urcolor/core";
import { cssLinearStops, defaultStepsFor, drawLinearGradient, getChannelConfig, interpolateStops } from "@urcolor/shared";
import { applyChannelOverrides, useGradientCanvas } from "../../shared/useGradientCanvas";
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

/**
 * The shader holds 16 uniform slots, so the WebGL path can never ask for more
 * than that. The CSS path has no such ceiling and asks for
 * `defaultStepsFor(…)` instead — 36 across a hue sweep, where banding between
 * sRGB-lerped stops is visible and 12 is not enough.
 */
const WEBGL_STOPS = 12;

// Auto-compute gradient colors from slider context when `colors` prop is not provided
function buildAutoColors(steps: number): Color[] | null {
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
}

const autoColors = computed<Color[] | null>(() => buildAutoColors(WEBGL_STOPS));

/**
 * The stop list both painters draw, differing only in how many stops they can
 * hold. Mirroring reverses the stops rather than flipping the gradient, which
 * is what the WebGL path has always done.
 */
function resolveColors(steps: number): Color[] | null {
  let colors: Color[];

  if (props.colors) {
    const parsed = props.colors.map((c: string) => Color.parse(c));
    if (parsed.some((c: Color | null) => !c) || parsed.length < 2) return null;
    colors = parsed as Color[];
  } else {
    const auto = buildAutoColors(steps);
    if (!auto || auto.length < 2) return null;
    colors = auto;
  }

  if (effectiveMirrorX.value || effectiveMirrorY.value) {
    colors = [...colors].reverse();
  }

  if (props.interpolationSpace) {
    return interpolateStops(colors, 32, props.interpolationSpace);
  }
  return colors;
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
      props.colors ? WEBGL_STOPS : defaultStepsFor(rootContext.colorSpace.value, rootContext.channel.value),
    );
    if (!colors) return null;
    return cssLinearStops(colors, effectiveAngle.value);
  },
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

function paint(canvas: HTMLCanvasElement) {
  const colors = resolveColors(WEBGL_STOPS);
  if (!colors) return;
  drawLinearGradient(canvas, colors, effectiveAngle.value, isAlphaChannel.value);
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
