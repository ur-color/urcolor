<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorRingGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  channelOverrides?: Record<string, number> | false;
  /** @deprecated Use innerRadius on ColorRingRoot instead */
  innerRadius?: number;
}
</script>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useForwardExpose, Primitive } from "reka-ui";
import { sampleConicRing, getChannelConfig } from "@urcolor/core";
import { applyChannelOverrides, renderToCanvas, useGradientCanvas } from "../../shared/useGradientCanvas";
import { CHECKERBOARD_BACKGROUND } from "../../shared/checkerboard";
import { injectColorRingRootContext } from "./ColorRingRoot.vue";

const props = withDefaults(defineProps<ColorRingGradientProps>(), {
  as: "span",
  channelOverrides: () => ({ alpha: 1 }),
});

const rootContext = injectColorRingRootContext();
useForwardExpose();

const canvasRef = ref<HTMLCanvasElement | null>(null);

// The annulus is cut here and nowhere else: the canvas paints the full square
// and this mask — which applies to the element and every descendant, canvas
// included — hides the hole and the corners. Clipping the canvas as well used
// to leave a seam, because the two edges are rasterised independently and their
// partial coverage multiplies along the boundary.
//
// The ±0.5px on the stops is what antialiases the edges: a gradient hard stop
// (two stops at one position) rasterises without any, so both circles came out
// visibly stepped.
const checkerboardMask = computed(() => {
  const p = (props.innerRadius ?? rootContext.innerRadius.value) * 100;
  return `radial-gradient(circle closest-side at center, transparent calc(${p}% - 0.5px), #000 calc(${p}% + 0.5px), #000 calc(100% - 0.5px), transparent 100%)`;
});

function paint(canvas: HTMLCanvasElement) {
  const colorSpace = rootContext.colorSpace.value;
  const channel = rootContext.channelKey.value;
  const baseColor = rootContext.colorRef.value;
  if (!baseColor) return;

  const overriddenBase = applyChannelOverrides(baseColor, colorSpace, props.channelOverrides);
  const cfg = getChannelConfig(colorSpace, channel);
  if (!cfg) return;

  const cMin = cfg.nativeMin ?? cfg.min;
  const cMax = cfg.nativeMax ?? cfg.max;

  const sampleSize = 128;
  const pixels = sampleConicRing(
    overriddenBase, colorSpace, channel, cMin, cMax,
    sampleSize, sampleSize,
    rootContext.startAngle.value,
  );
  renderToCanvas({ canvas, pixels, sampleWidth: sampleSize, sampleHeight: sampleSize });
}

useGradientCanvas({
  canvas: canvasRef,
  // `innerRadius` is not a source: it only moves the mask, and the pixels the
  // canvas paints are the same at every radius.
  sources: () => [
    props.channelOverrides,
    rootContext.colorSpace.value, rootContext.channelKey.value,
    rootContext.colorRef.value, rootContext.startAngle.value,
  ],
  paint,
  isDragging: rootContext.isDragging,
});
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :style="{ background: CHECKERBOARD_BACKGROUND, maskImage: checkerboardMask, WebkitMaskImage: checkerboardMask }"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
  >
    <canvas
      ref="canvasRef"
      :style="{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' }"
    />
    <slot />
  </Primitive>
</template>
