<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
import type { SpaceId } from "@urcolor/core";
import type { GradientRenderer } from "@urcolor/shared";

export interface ColorAreaGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /**
   * Which painter to use.
   * - `"auto"` (default) — CSS when an exact recipe exists, canvas otherwise
   * - `"css"` — force CSS; falls back to the canvas with a dev warning if none exists
   * - `"canvas"` — force the canvas painter
   */
  renderer?: GradientRenderer;
  /** Color for the top-left corner. Accepts any CSS color string supported by culori (hex, rgb(), hsl(), oklch(), color(), named colors, etc.). */
  topLeft?: string;
  /** Color for the top-right corner. */
  topRight?: string;
  /** Color for the bottom-left corner. */
  bottomLeft?: string;
  /** Color for the bottom-right corner. */
  bottomRight?: string;
  /** When set to a non-RGB color space, uses 2D canvas with perceptual interpolation in that space instead of WebGL (sRGB). */
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
import { cssAreaBilinear, cssAreaChannels, drawGradient, getChannelConfig, sampleBilinearGrid, sampleChannelGrid } from "@urcolor/shared";
import { applyChannelOverrides, renderToCanvas, useGradientCanvas } from "../../shared/useGradientCanvas";
import { CSS_GRADIENT_ROOT_STYLE, cssLayerStyle, useCssGradient } from "../../shared/useCssGradient";
import { CHECKERBOARD_BACKGROUND } from "../../shared/checkerboard";
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";

const props = withDefaults(defineProps<ColorAreaGradientProps>(), {
  as: "span",
  renderer: "auto",
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

/**
 * The four corners in screen order, with the mirror swap the CPU path applies.
 * `hasAlphaAxis` decides whether the corners keep their own alpha, matching the
 * flag `drawGradient` and `sampleBilinearGrid` are handed.
 */
function orientedCorners(): [Color, Color, Color, Color] | null {
  const parsed = [props.topLeft, props.topRight, props.bottomLeft, props.bottomRight]
    .map(c => Color.parse(c ?? "black"));
  if (parsed.some(c => !c)) return null;

  let [a, b, c, d] = parsed as [Color, Color, Color, Color];
  if (!hasAlphaAxis.value) [a, b, c, d] = [a.withAlpha(1), b.withAlpha(1), c.withAlpha(1), d.withAlpha(1)];
  if (!rootContext.isSlidingFromLeft.value) [a, b, c, d] = [b, a, d, c];
  if (!rootContext.isSlidingFromTop.value) [a, b, c, d] = [c, d, a, b];
  return [a, b, c, d];
}

const cssLayers = useCssGradient({
  renderer: () => props.renderer,
  name: "ColorAreaGradient",
  build: () => {
    if (props.topLeft || props.topRight || props.bottomLeft || props.bottomRight) {
      // `interpolationSpace` stays on the canvas. The two row gradients could be
      // densified into stops in that space, but the vertical lerp is a sRGB
      // alpha composite either way — the result would be perceptual on one axis
      // and not the other, which is worse than not taking this path.
      if (props.interpolationSpace) return null;
      const corners = orientedCorners();
      return corners ? cssAreaBilinear(...corners) : null;
    }

    const colorSpace = rootContext.colorSpace.value;
    const baseColor = rootContext.colorRef.value;
    if (!baseColor || !colorSpace) return null;

    return cssAreaChannels(
      applyChannelOverrides(baseColor, colorSpace, props.channelOverrides),
      colorSpace,
      xIsAlpha.value ? null : rootContext.xChannelKey.value,
      yIsAlpha.value ? null : rootContext.yChannelKey.value,
      rootContext.isSlidingFromLeft.value,
      rootContext.isSlidingFromTop.value,
    );
  },
});

function paint(canvas: HTMLCanvasElement) {
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
      renderToCanvas({ canvas, pixels, sampleWidth: sampleW, sampleHeight: sampleH });
    } else {
      // WebGL path: use mirror uniforms
      drawGradient(canvas, tl, tr, bl, br, hasAlphaAxis.value, mirrorX.value, mirrorY.value);
    }
    return;
  }

  // Channel-based rendering from root context
  if (baseColorObj && colorSpace) {
    // Apply channel overrides to the base color before sampling
    const overriddenBase = applyChannelOverrides(baseColorObj, colorSpace, props.channelOverrides);

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

      const xMinVal = xCfg.nativeMin ?? xCfg.min;
      const xMaxVal = xCfg.nativeMax ?? xCfg.max;
      const yMinVal = yCfg.nativeMin ?? yCfg.min;
      const yMaxVal = yCfg.nativeMax ?? yCfg.max;

      const sampleW = 64;
      const sampleH = 64;
      const pixels = sampleChannelGrid(
        overriddenBase, colorSpace,
        effectiveXChannel, effectiveYChannel,
        slidingFromLeft ? xMinVal : xMaxVal, slidingFromLeft ? xMaxVal : xMinVal,
        slidingFromTop ? yMinVal : yMaxVal, slidingFromTop ? yMaxVal : yMinVal,
        sampleW, sampleH, hasAlphaAxis.value,
      );
      renderToCanvas({ canvas, pixels, sampleWidth: sampleW, sampleHeight: sampleH });
    } else {
      // One axis is alpha — render a 2D grid: real channel on one axis, alpha on the other
      const channelKey = effectiveXChannel ?? effectiveYChannel!;
      const cfg = getChannelConfig(colorSpace, channelKey);
      if (!cfg) return;

      const cMin = cfg.nativeMin ?? cfg.min;
      const cMax = cfg.nativeMax ?? cfg.max;

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

          const c = overriddenBase.with({
            space: colorSpace,
            [channelKey]: realVal,
          });
          const rgb = c.to("srgb");
          const idx = (y * sampleW + x) * 4;
          data[idx] = Math.round(Math.max(0, Math.min(1, rgb.get("r"))) * 255);
          data[idx + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g"))) * 255);
          data[idx + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b"))) * 255);
          data[idx + 3] = Math.round(Math.max(0, Math.min(1, alphaVal)) * 255);
        }
      }
      renderToCanvas({ canvas, pixels: data, sampleWidth: sampleW, sampleHeight: sampleH });
    }
  }
}

useGradientCanvas({
  canvas: canvasRef,
  sources: () => [
    props.topLeft, props.topRight, props.bottomLeft, props.bottomRight,
    props.interpolationSpace, props.channelOverrides,
    rootContext.colorSpace.value, rootContext.xChannelKey.value, rootContext.yChannelKey.value,
    rootContext.colorRef.value,
    rootContext.isSlidingFromLeft.value, rootContext.isSlidingFromTop.value,
  ],
  paint,
  isDragging: rootContext.isDragging,
  // The corner-colour path without an `interpolationSpace` paints via WebGL.
  usesWebGL: true,
});
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :style="{ background: CHECKERBOARD_BACKGROUND }"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
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
