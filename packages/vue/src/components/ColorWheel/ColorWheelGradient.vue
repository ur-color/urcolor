<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorWheelGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  channelOverrides?: Record<string, number> | false;
}
</script>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { useForwardExpose, Primitive } from "reka-ui";
import { Color } from "internationalized-color";
import { samplePolarGrid, getChannelConfig } from "@urcolor/core";
import { injectColorWheelRootContext } from "./ColorWheelRoot.vue";

const props = withDefaults(defineProps<ColorWheelGradientProps>(), {
  as: "span",
  channelOverrides: () => ({ alpha: 1 }),
});

const rootContext = injectColorWheelRootContext();
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
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreen, 0, 0, w, h);
}

function render() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const colorSpace = rootContext.colorSpace.value;
  const baseColor = rootContext.colorRef.value;
  if (!baseColor) return;

  const overriddenBase = applyOverrides(baseColor, colorSpace);
  const angleCfg = getChannelConfig(colorSpace, rootContext.angleChannelKey.value);
  const radiusCfg = getChannelConfig(colorSpace, rootContext.radiusChannelKey.value);
  if (!angleCfg || !radiusCfg) return;

  const aMin = angleCfg.culoriMin ?? angleCfg.min;
  const aMax = angleCfg.culoriMax ?? angleCfg.max;
  const rMin = radiusCfg.culoriMin ?? radiusCfg.min;
  const rMax = radiusCfg.culoriMax ?? radiusCfg.max;

  const sampleSize = 128;
  const pixels = samplePolarGrid(
    overriddenBase, colorSpace,
    rootContext.angleChannelKey.value, rootContext.radiusChannelKey.value,
    aMin, aMax, rMin, rMax,
    sampleSize, sampleSize,
    rootContext.startAngle.value,
  );
  renderToCanvas(canvas, pixels, sampleSize, sampleSize);
}

useResizeObserver(canvasRef, () => render());

watch(
  () => [
    props.channelOverrides,
    rootContext.colorSpace.value, rootContext.angleChannelKey.value, rootContext.radiusChannelKey.value,
    rootContext.colorRef.value, rootContext.startAngle.value,
  ],
  () => render(),
  { flush: "post" },
);

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
      :style="{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', clipPath: 'circle(50%)' }"
    />
    <slot />
  </Primitive>
</template>
