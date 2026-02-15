<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorAreaGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** Color for the top-left corner. Accepts any CSS color string supported by culori (hex, rgb(), hsl(), oklch(), color(), named colors, etc.). */
  topLeft?: string;
  /** Color for the top-right corner. */
  topRight?: string;
  /** Color for the bottom-left corner. */
  bottomLeft?: string;
  /** Color for the bottom-right corner. */
  bottomRight?: string;
  /** When set to a non-RGB color space, uses 2D canvas with perceptual interpolation in that space instead of WebGL (sRGB). */
  interpolationSpace?: string;
  /** Base color for channel-based rendering. When set along with colorSpace/xChannel/yChannel, renders by sampling each pixel directly instead of bilinear interpolation. */
  baseColor?: string;
  /** Color space for channel-based rendering. */
  colorSpace?: string;
  /** X-axis channel key for channel-based rendering. */
  xChannel?: string;
  /** Y-axis channel key for channel-based rendering. */
  yChannel?: string;
}
</script>

<script setup lang="ts">
import "internationalized-color/css";
import { ref, watch, onBeforeUnmount } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { useForwardExpose, Primitive } from "reka-ui";
import { Color } from "internationalized-color";
import { drawGradient, sampleBilinearGrid, sampleChannelGrid, getChannelConfig } from "@urcolor/core";
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";

const props = withDefaults(defineProps<ColorAreaGradientProps>(), {
  as: "span",
});

const rootContext = injectColorAreaRootContext();

useForwardExpose();

const canvasRef = ref<HTMLCanvasElement | null>(null);

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

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreen, 0, 0, w, h);
}

function render() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const slidingFromLeft = rootContext.isSlidingFromLeft.value;
  const slidingFromTop = rootContext.isSlidingFromTop.value;

  // Channel-based rendering mode
  if (props.baseColor && props.colorSpace && props.xChannel && props.yChannel) {
    const base = Color.parse(props.baseColor);
    if (!base) return;

    const xCfg = getChannelConfig(props.colorSpace, props.xChannel);
    const yCfg = getChannelConfig(props.colorSpace, props.yChannel);
    if (!xCfg || !yCfg) return;

    const xMinVal = xCfg.culoriMin ?? xCfg.min;
    const xMaxVal = xCfg.culoriMax ?? xCfg.max;
    const yMinVal = yCfg.culoriMin ?? yCfg.min;
    const yMaxVal = yCfg.culoriMax ?? yCfg.max;

    const sampleW = 64;
    const sampleH = 64;
    const pixels = sampleChannelGrid(
      base, props.colorSpace,
      props.xChannel, props.yChannel,
      slidingFromLeft ? xMinVal : xMaxVal, slidingFromLeft ? xMaxVal : xMinVal,
      slidingFromTop ? yMinVal : yMaxVal, slidingFromTop ? yMaxVal : yMinVal,
      sampleW, sampleH,
    );
    renderToCanvas(canvas, pixels, sampleW, sampleH);
    return;
  }

  const tl = Color.parse(props.topLeft ?? "black");
  const tr = Color.parse(props.topRight ?? "black");
  const bl = Color.parse(props.bottomLeft ?? "black");
  const br = Color.parse(props.bottomRight ?? "black");

  if (!tl || !tr || !bl || !br) return;

  // Swap corners based on axis direction
  const [ctl, ctr, cbl, cbr] = (() => {
    let [a, b, c, d] = [tl, tr, bl, br];
    if (!slidingFromLeft) [a, b, c, d] = [b, a, d, c];
    if (!slidingFromTop) [a, b, c, d] = [c, d, a, b];
    return [a, b, c, d];
  })();

  if (props.interpolationSpace) {
    const sampleW = 64;
    const sampleH = 64;
    const pixels = sampleBilinearGrid(ctl, ctr, cbl, cbr, sampleW, sampleH, props.interpolationSpace);
    renderToCanvas(canvas, pixels, sampleW, sampleH);
  } else {
    drawGradient(canvas, ctl, ctr, cbl, cbr);
  }
}

useResizeObserver(canvasRef, () => {
  render();
});

watch(
  () => [props.topLeft, props.topRight, props.bottomLeft, props.bottomRight, props.interpolationSpace, props.baseColor, props.colorSpace, props.xChannel, props.yChannel, rootContext.isSlidingFromLeft.value, rootContext.isSlidingFromTop.value],
  () => render(),
  { flush: "post" },
);

onBeforeUnmount(() => {
  const canvas = canvasRef.value;
  if (canvas) {
    const gl = canvas.getContext("webgl");
    if (gl) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }
});
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
  >
    <canvas
      ref="canvasRef"
      style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;"
    />
    <slot />
  </Primitive>
</template>
