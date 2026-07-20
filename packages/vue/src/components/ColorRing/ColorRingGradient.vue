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
import { ref } from "vue";
import { useForwardExpose, Primitive } from "reka-ui";
import { sampleConicRing, getChannelConfig } from "@urcolor/core";
import { applyChannelOverrides, renderToCanvas, useGradientCanvas } from "../../shared/useGradientCanvas";
import { injectColorRingRootContext } from "./ColorRingRoot.vue";

const props = withDefaults(defineProps<ColorRingGradientProps>(), {
  as: "span",
  channelOverrides: () => ({ alpha: 1 }),
});

const rootContext = injectColorRingRootContext();
useForwardExpose();

const canvasRef = ref<HTMLCanvasElement | null>(null);

/** Clip to the ring shape using a two-arc path with even-odd winding. */
function clipToRing(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(cx, cy);
  const innerR = outerR * (props.innerRadius ?? rootContext.innerRadius.value);

  ctx.beginPath();
  // Outer circle clockwise
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  // Inner circle counter-clockwise (creates the hole)
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
  ctx.clip("evenodd");
}

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
  renderToCanvas(canvas, pixels, sampleSize, sampleSize, clipToRing);
}

useGradientCanvas({
  canvas: canvasRef,
  sources: () => [
    props.channelOverrides, (props.innerRadius ?? rootContext.innerRadius.value),
    rootContext.colorSpace.value, rootContext.channelKey.value,
    rootContext.colorRef.value, rootContext.startAngle.value,
  ],
  paint,
  isDragging: rootContext.isDragging,
});
</script>

<template>
  <Primitive :as-child="asChild" :as="as" :data-disabled="rootContext.disabled.value ? '' : undefined">
    <canvas
      ref="canvasRef"
      :style="{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' }"
    />
    <slot />
  </Primitive>
</template>
