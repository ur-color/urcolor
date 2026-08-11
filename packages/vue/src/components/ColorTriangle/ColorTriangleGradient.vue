<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
import type { GradientRenderer } from "@urcolor/shared";

export interface ColorTriangleGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /**
   * Which painter to use. A barycentric sweep has no CSS equivalent, so this
   * component always paints into a canvas — the prop exists for symmetry with
   * the other gradients, and `"css"` warns and falls back.
   */
  renderer?: GradientRenderer;
  channelOverrides?: Record<string, number> | false;
}
</script>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useForwardExpose, Primitive } from "reka-ui";
import { getChannelConfig, sampleTriangleGrid } from "@urcolor/shared";
import { applyChannelOverrides, renderToCanvas, useGradientCanvas } from "../../shared/useGradientCanvas";
import { warnNoCssRecipe } from "../../shared/useCssGradient";
import { CHECKERBOARD_BACKGROUND } from "../../shared/checkerboard";
import { injectColorTriangleRootContext } from "./ColorTriangleRoot.vue";

const props = withDefaults(defineProps<ColorTriangleGradientProps>(), {
  as: "span",
  renderer: "auto",
  channelOverrides: () => ({ alpha: 1 }),
});

const rootContext = injectColorTriangleRootContext();
useForwardExpose();

// A barycentric sweep has no CSS equivalent, so there is nothing to resolve —
// only the same warning the other gradients emit when asked for the impossible.
if (props.renderer === "css") warnNoCssRecipe("ColorTriangleGradient");

const canvasRef = ref<HTMLCanvasElement | null>(null);

// Cut once, on the wrapper — it clips the canvas with it. Clipping the canvas
// to the same polygon as well left a seam along the three edges: each clip
// antialiases independently and the two partial coverages multiply.
// `sampleTriangleGrid` clamps its barycentric coordinates, so the canvas is
// coloured out to its corners and nothing translucent can show through.
const clipPath = computed(() => {
  const [v0, v1, v2] = rootContext.vertices.value;
  return `polygon(${v0.x * 100}% ${v0.y * 100}%, ${v1.x * 100}% ${v1.y * 100}%, ${v2.x * 100}% ${v2.y * 100}%)`;
});

function paint(canvas: HTMLCanvasElement) {
  // Sampling a triangle is the most expensive of the five grids; skip it
  // entirely for a canvas that has no layout box yet (a hidden or not-yet-laid
  // out picker). There is no other guard against this: the resize observer
  // that delivers the first paint never fires for a zero-sized canvas in the
  // first place, so this bail only matters for a later repaint after the
  // canvas shrinks to nothing.
  const dpr = typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (w === 0 || h === 0) return;

  const colorSpace = rootContext.colorSpace.value;
  const baseColor = rootContext.colorRef.value;
  if (!baseColor) return;

  const overriddenBase = applyChannelOverrides(baseColor, colorSpace, props.channelOverrides);
  const xCfg = getChannelConfig(colorSpace, rootContext.xChannelKey.value);
  const yCfg = getChannelConfig(colorSpace, rootContext.yChannelKey.value);
  if (!xCfg || !yCfg) return;

  const xMinVal = xCfg.nativeMin ?? xCfg.min;
  const xMaxVal = xCfg.nativeMax ?? xCfg.max;
  const yMinVal = yCfg.nativeMin ?? yCfg.min;
  const yMaxVal = yCfg.nativeMax ?? yCfg.max;

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
      zMinVal = zCfg.nativeMin ?? zCfg.min;
      zMaxVal = zCfg.nativeMax ?? zCfg.max;
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
  renderToCanvas({ canvas, pixels, sampleWidth: sampleSize, sampleHeight: sampleSize });
}

useGradientCanvas({
  canvas: canvasRef,
  sources: () => [
    props.channelOverrides,
    rootContext.colorSpace.value, rootContext.xChannelKey.value, rootContext.yChannelKey.value, rootContext.zChannelKey.value,
    rootContext.colorRef.value, rootContext.rotation.value,
  ],
  paint,
  isDragging: rootContext.isDragging,
});
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :style="{ background: CHECKERBOARD_BACKGROUND, clipPath }"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
  >
    <canvas
      ref="canvasRef"
      :style="{
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }"
    />
    <slot />
  </Primitive>
</template>
