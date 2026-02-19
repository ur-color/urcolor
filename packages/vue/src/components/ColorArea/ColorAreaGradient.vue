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
import "internationalized-color/css";
import { ref, watch, computed, onBeforeUnmount } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { useForwardExpose, Primitive } from "reka-ui";
import { Color } from "internationalized-color";
import { drawGradient, sampleBilinearGrid, sampleChannelGrid, getChannelConfig } from "@urcolor/core";
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";

const props = withDefaults(defineProps<ColorAreaGradientProps>(), {
  as: "span",
  channelOverrides: () => ({ alpha: 1 }),
});

const rootContext = injectColorAreaRootContext();

useForwardExpose();

const canvasRef = ref<HTMLCanvasElement | null>(null);

// Mirror flags derived from sliding direction
const mirrorX = computed(() => !rootContext.isSlidingFromLeft.value);
const mirrorY = computed(() => !rootContext.isSlidingFromTop.value);

// Determine if either axis is alpha
const xIsAlpha = computed(() => rootContext.xChannelKey.value === "alpha");
const yIsAlpha = computed(() => rootContext.yChannelKey.value === "alpha");
const hasAlphaAxis = computed(() => xIsAlpha.value || yIsAlpha.value);

// Canvas opacity: reflect color's alpha when overrides don't include alpha (and axis isn't alpha)
const canvasOpacity = computed(() => {
  if (hasAlphaAxis.value) return 1;
  const overrides = props.channelOverrides;
  if (overrides === false || (typeof overrides === "object" && overrides.alpha === undefined)) {
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

  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreen, 0, 0, w, h);
}

function applyOverrides(baseColor: Color, colorSpace: string): Color {
  const overrides: Record<string, number> | false = props.channelOverrides as any;
  if (!overrides) return baseColor;

  const channelUpdates: Record<string, number> = {};
  let result = baseColor;
  for (const [k, v] of Object.entries(overrides)) {
    if (k === "alpha") {
      result = result.set({ alpha: v });
    } else {
      channelUpdates[k] = v;
    }
  }
  if (Object.keys(channelUpdates).length > 0) {
    result = result.set({ mode: colorSpace, ...channelUpdates });
  }
  return result;
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

    if (props.interpolationSpace) {
      // CPU path: swap corners for mirroring
      const [ctl, ctr, cbl, cbr] = (() => {
        let [a, b, c, d] = [tl, tr, bl, br];
        if (!slidingFromLeft) [a, b, c, d] = [b, a, d, c];
        if (!slidingFromTop) [a, b, c, d] = [c, d, a, b];
        return [a, b, c, d];
      })();
      const sampleW = 64;
      const sampleH = 64;
      const pixels = sampleBilinearGrid(ctl, ctr, cbl, cbr, sampleW, sampleH, props.interpolationSpace, hasAlphaAxis.value);
      renderToCanvas(canvas, pixels, sampleW, sampleH);
    } else {
      // WebGL path: use mirror uniforms
      drawGradient(canvas, tl, tr, bl, br, hasAlphaAxis.value, mirrorX.value, mirrorY.value);
    }
    return;
  }

  // Channel-based rendering from root context
  if (baseColorObj && colorSpace) {
    // Apply channel overrides to the base color before sampling
    const overriddenBase = applyOverrides(baseColorObj, colorSpace);

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
        overriddenBase, colorSpace,
        effectiveXChannel, effectiveYChannel,
        slidingFromLeft ? xMinVal : xMaxVal, slidingFromLeft ? xMaxVal : xMinVal,
        slidingFromTop ? yMinVal : yMaxVal, slidingFromTop ? yMaxVal : yMinVal,
        sampleW, sampleH, hasAlphaAxis.value,
      );
      renderToCanvas(canvas, pixels, sampleW, sampleH);
    } else {
      // One axis is alpha — render a 2D grid: real channel on one axis, alpha on the other
      const channelKey = effectiveXChannel ?? effectiveYChannel!;
      const cfg = getChannelConfig(colorSpace, channelKey);
      if (!cfg) return;

      const cMin = cfg.culoriMin ?? cfg.min;
      const cMax = cfg.culoriMax ?? cfg.max;

      const isXReal = !!effectiveXChannel;
      const sampleW = 64;
      const sampleH = 64;

      const slidingForwardReal = isXReal ? slidingFromLeft : slidingFromTop;
      const slidingForwardAlpha = isXReal ? slidingFromTop : slidingFromLeft;

      // Sample a 2D grid: one axis is the real channel, the other is alpha (0–1)
      const realMin = slidingForwardReal ? cMin : cMax;
      const realMax = slidingForwardReal ? cMax : cMin;
      const alphaMin = slidingForwardAlpha ? 0 : 1;
      const alphaMax = slidingForwardAlpha ? 1 : 0;

      const data = new Uint8ClampedArray(sampleW * sampleH * 4);
      for (let y = 0; y < sampleH; y++) {
        const vy = y / (sampleH - 1);
        for (let x = 0; x < sampleW; x++) {
          const vx = x / (sampleW - 1);

          const realVal = isXReal
            ? realMin + vx * (realMax - realMin)
            : realMin + vy * (realMax - realMin);
          const alphaVal = isXReal
            ? alphaMin + vy * (alphaMax - alphaMin)
            : alphaMin + vx * (alphaMax - alphaMin);

          const c = overriddenBase.set({
            mode: colorSpace,
            [channelKey]: realVal,
          });
          if (!c) continue;
          const rgb = c.to("rgb");
          if (!rgb) continue;
          const idx = (y * sampleW + x) * 4;
          data[idx] = Math.round(Math.max(0, Math.min(1, rgb.get("r", 0))) * 255);
          data[idx + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g", 0))) * 255);
          data[idx + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b", 0))) * 255);
          data[idx + 3] = Math.round(Math.max(0, Math.min(1, alphaVal)) * 255);
        }
      }
      renderToCanvas(canvas, data, sampleW, sampleH);
    }
  }
}

useResizeObserver(canvasRef, () => {
  render();
});

watch(
  () => [
    props.topLeft, props.topRight, props.bottomLeft, props.bottomRight,
    props.interpolationSpace, props.channelOverrides,
    rootContext.colorSpace.value, rootContext.xChannelKey.value, rootContext.yChannelKey.value,
    rootContext.colorRef.value,
    rootContext.isSlidingFromLeft.value, rootContext.isSlidingFromTop.value,
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
