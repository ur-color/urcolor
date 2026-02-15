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
  /** When true, renders a checkerboard pattern behind the gradient to visualize alpha transparency. */
  alpha?: boolean;
}
</script>

<script setup lang="ts">
import "internationalized-color/css";
import { ref, watch, computed, onBeforeUnmount } from "vue";
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

// Determine if either axis is alpha
const xIsAlpha = computed(() => rootContext.xChannelKey.value === "alpha");
const yIsAlpha = computed(() => rootContext.yChannelKey.value === "alpha");
const hasAlphaAxis = computed(() => xIsAlpha.value || yIsAlpha.value);

// Canvas opacity: reflect color's alpha when alpha prop is enabled (but not when axis IS alpha)
const canvasOpacity = computed(() => {
  if ((props.alpha || rootContext.alpha.value) && !hasAlphaAxis.value) {
    return rootContext.colorRef.value?.alpha ?? 1;
  }
  return 1;
});

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

  // Channel-based rendering mode: read from root context
  const colorSpace = rootContext.colorSpace.value;
  const xChannel = rootContext.xChannelKey.value;
  const yChannel = rootContext.yChannelKey.value;
  const baseColorObj = rootContext.colorRef.value;

  // If we have corner colors, use bilinear mode
  if (props.topLeft || props.topRight || props.bottomLeft || props.bottomRight) {
    const tl = Color.parse(props.topLeft ?? "black");
    const tr = Color.parse(props.topRight ?? "black");
    const bl = Color.parse(props.bottomLeft ?? "black");
    const br = Color.parse(props.bottomRight ?? "black");

    if (!tl || !tr || !bl || !br) return;

    const [ctl, ctr, cbl, cbr] = (() => {
      let [a, b, c, d] = [tl, tr, bl, br];
      if (!slidingFromLeft) [a, b, c, d] = [b, a, d, c];
      if (!slidingFromTop) [a, b, c, d] = [c, d, a, b];
      return [a, b, c, d];
    })();

    if (props.interpolationSpace) {
      const sampleW = 64;
      const sampleH = 64;
      const pixels = sampleBilinearGrid(ctl, ctr, cbl, cbr, sampleW, sampleH, props.interpolationSpace, hasAlphaAxis.value);
      renderToCanvas(canvas, pixels, sampleW, sampleH);
    } else {
      drawGradient(canvas, ctl, ctr, cbl, cbr, hasAlphaAxis.value);
    }
    return;
  }

  // Channel-based rendering from root context
  if (baseColorObj && colorSpace) {
    // Resolve the actual channel keys for sampling (skip alpha axes)
    const effectiveXChannel = xIsAlpha.value ? null : xChannel;
    const effectiveYChannel = yIsAlpha.value ? null : yChannel;

    // We need at least one real channel axis to sample
    const realChannel = effectiveXChannel ?? effectiveYChannel;
    if (!realChannel) return;

    if (effectiveXChannel && effectiveYChannel) {
      // Both axes are real channels — standard 2D channel sampling
      const xCfg = getChannelConfig(colorSpace, effectiveXChannel);
      const yCfg = getChannelConfig(colorSpace, effectiveYChannel);
      if (!xCfg || !yCfg) return;

      const xMinVal = xCfg.culoriMin ?? xCfg.min;
      const xMaxVal = xCfg.culoriMax ?? xCfg.max;
      const yMinVal = yCfg.culoriMin ?? yCfg.min;
      const yMaxVal = yCfg.culoriMax ?? yCfg.max;

      const sampleW = 64;
      const sampleH = 64;
      const pixels = sampleChannelGrid(
        baseColorObj, colorSpace,
        effectiveXChannel, effectiveYChannel,
        slidingFromLeft ? xMinVal : xMaxVal, slidingFromLeft ? xMaxVal : xMinVal,
        slidingFromTop ? yMinVal : yMaxVal, slidingFromTop ? yMaxVal : yMinVal,
        sampleW, sampleH, hasAlphaAxis.value,
      );
      renderToCanvas(canvas, pixels, sampleW, sampleH);
    } else {
      // One axis is alpha — render a 1D channel gradient on the non-alpha axis
      const channelKey = effectiveXChannel ?? effectiveYChannel!;
      const cfg = getChannelConfig(colorSpace, channelKey);
      if (!cfg) return;

      const cMin = cfg.culoriMin ?? cfg.min;
      const cMax = cfg.culoriMax ?? cfg.max;

      const isXReal = !!effectiveXChannel;
      const sampleW = isXReal ? 64 : 1;
      const sampleH = isXReal ? 1 : 64;

      // Sample along the real channel axis
      const slidingForward = isXReal ? slidingFromLeft : slidingFromTop;

      const pixels = sampleChannelGrid(
        baseColorObj, colorSpace,
        channelKey, channelKey,
        slidingForward ? cMin : cMax, slidingForward ? cMax : cMin,
        slidingForward ? cMin : cMax, slidingForward ? cMax : cMin,
        isXReal ? sampleW : 1, isXReal ? 1 : sampleH,
      );
      renderToCanvas(canvas, pixels, isXReal ? sampleW : 1, isXReal ? 1 : sampleH);
    }
  }
}

useResizeObserver(canvasRef, () => {
  render();
});

watch(
  () => [
    props.topLeft, props.topRight, props.bottomLeft, props.bottomRight,
    props.interpolationSpace,
    rootContext.colorSpace.value, rootContext.xChannelKey.value, rootContext.yChannelKey.value,
    rootContext.colorRef.value,
    rootContext.isSlidingFromLeft.value, rootContext.isSlidingFromTop.value,
  ],
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
      :style="{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', opacity: canvasOpacity }"
    />
    <slot />
  </Primitive>
</template>
