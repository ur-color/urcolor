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
import { ref, watch, computed, onBeforeUnmount } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { useForwardExpose, Primitive } from "reka-ui";
import { Color } from "internationalized-color";
import { sampleConicRing, getChannelConfig } from "@urcolor/core";
import { injectColorRingRootContext } from "./ColorRingRoot.vue";

const props = withDefaults(defineProps<ColorRingGradientProps>(), {
  as: "span",
  channelOverrides: () => ({ alpha: 1 }),
});

const rootContext = injectColorRingRootContext();
useForwardExpose();

const canvasRef = ref<HTMLCanvasElement | null>(null);

function applyOverrides(baseColor: Color, colorSpace: string): Color {
  const overrides = props.channelOverrides;
  if (!overrides) return baseColor;
  let result = baseColor;
  const channelUpdates: Record<string, number> = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (k === "alpha") result = result.set({ alpha: v });
    else channelUpdates[k] = v;
  }
  if (Object.keys(channelUpdates).length > 0) {
    result = result.set({ mode: colorSpace, ...channelUpdates });
  }
  return result;
}

function renderToCanvas(canvas: HTMLCanvasElement, pixels: Uint8ClampedArray, sampleW: number, sampleH: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const pixelData = new Uint8ClampedArray(pixels.buffer) as unknown as Uint8ClampedArray<ArrayBuffer>;
  const imageData = new ImageData(pixelData, sampleW, sampleH);
  const offscreen = new OffscreenCanvas(sampleW, sampleH);
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;
  offCtx.putImageData(imageData, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Clip to ring shape using path with evenodd winding
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(cx, cy);
  const innerR = outerR * (props.innerRadius ?? rootContext.innerRadius.value);

  ctx.save();
  ctx.beginPath();
  // Outer circle clockwise
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  // Inner circle counter-clockwise (creates the hole)
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
  ctx.clip("evenodd");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreen, 0, 0, w, h);
  ctx.restore();
}

function render() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const colorSpace = rootContext.colorSpace.value;
  const channel = rootContext.channelKey.value;
  const baseColor = rootContext.colorRef.value;
  if (!baseColor) return;

  const overriddenBase = applyOverrides(baseColor, colorSpace);
  const cfg = getChannelConfig(colorSpace, channel);
  if (!cfg) return;

  const cMin = cfg.culoriMin ?? cfg.min;
  const cMax = cfg.culoriMax ?? cfg.max;

  const sampleSize = 128;
  const pixels = sampleConicRing(
    overriddenBase, colorSpace, channel, cMin, cMax,
    sampleSize, sampleSize,
    rootContext.startAngle.value,
  );
  renderToCanvas(canvas, pixels, sampleSize, sampleSize);
}

useResizeObserver(canvasRef, () => render());

watch(
  () => [
    props.channelOverrides, (props.innerRadius ?? rootContext.innerRadius.value),
    rootContext.colorSpace.value, rootContext.channelKey.value,
    rootContext.colorRef.value, rootContext.startAngle.value,
  ],
  () => { if (!rootContext.isDragging.value) render(); },
  { flush: "post" },
);

watch(() => rootContext.isDragging.value, (dragging, wasDragging) => {
  if (wasDragging && !dragging) render();
});

onBeforeUnmount(() => {
  const canvas = canvasRef.value;
  if (canvas) {
    const gl = canvas.getContext("webgl");
    if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
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
