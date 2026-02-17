<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorTriangleGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  channelOverrides?: Record<string, number> | false;
}
</script>

<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { useForwardExpose, Primitive } from "reka-ui";
import { Color } from "internationalized-color";
import { sampleTriangleGrid, getChannelConfig } from "@urcolor/core";
import { injectColorTriangleRootContext } from "./ColorTriangleRoot.vue";

const props = withDefaults(defineProps<ColorTriangleGradientProps>(), {
  as: "span",
  channelOverrides: () => ({ alpha: 1 }),
});

const rootContext = injectColorTriangleRootContext();
useForwardExpose();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const clipPath = computed(() => {
  const [v0, v1, v2] = rootContext.vertices.value;
  return `polygon(${v0.x * 100}% ${v0.y * 100}%, ${v1.x * 100}% ${v1.y * 100}%, ${v2.x * 100}% ${v2.y * 100}%)`;
});

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

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (w === 0 || h === 0) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const colorSpace = rootContext.colorSpace.value;
  const baseColor = rootContext.colorRef.value;
  if (!baseColor) return;

  const overriddenBase = applyOverrides(baseColor, colorSpace);
  const xCfg = getChannelConfig(colorSpace, rootContext.xChannelKey.value);
  const yCfg = getChannelConfig(colorSpace, rootContext.yChannelKey.value);
  if (!xCfg || !yCfg) return;

  const xMinVal = xCfg.culoriMin ?? xCfg.min;
  const xMaxVal = xCfg.culoriMax ?? xCfg.max;
  const yMinVal = yCfg.culoriMin ?? yCfg.min;
  const yMaxVal = yCfg.culoriMax ?? yCfg.max;

  const [v0, v1, v2] = rootContext.vertices.value;
  const sampleSize = 64;

  // Optional z-channel for 3-channel mode
  let zChannel: string | undefined;
  let zMinVal: number | undefined;
  let zMaxVal: number | undefined;
  if (rootContext.isThreeChannel.value && rootContext.zChannelKey.value) {
    const zCfg = getChannelConfig(colorSpace, rootContext.zChannelKey.value);
    if (zCfg) {
      zChannel = rootContext.zChannelKey.value;
      zMinVal = zCfg.culoriMin ?? zCfg.min;
      zMaxVal = zCfg.culoriMax ?? zCfg.max;
    }
  }

  const pixels = sampleTriangleGrid(
    overriddenBase, colorSpace,
    rootContext.xChannelKey.value, rootContext.yChannelKey.value,
    xMinVal, xMaxVal, yMinVal, yMaxVal,
    v0, v1, v2,
    sampleSize, sampleSize,
    false,
    zChannel, zMinVal, zMaxVal,
  );
  renderToCanvas(canvas, pixels, sampleSize, sampleSize);
}

useResizeObserver(canvasRef, () => {
  render();
});

watch(
  () => [
    props.channelOverrides,
    rootContext.colorSpace.value, rootContext.xChannelKey.value, rootContext.yChannelKey.value, rootContext.zChannelKey.value,
    rootContext.colorRef.value, rootContext.rotation.value,
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
      :style="{
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        clipPath,
      }"
    />
    <slot />
  </Primitive>
</template>
