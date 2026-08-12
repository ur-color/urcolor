<script lang="ts">
import type { PrimitiveProps } from "../../primitives/types";
import type { GradientRenderer } from "@urcolor/shared";

export interface ColorWheelGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /**
   * Which painter to use.
   * - `"auto"` (default) — CSS when an exact recipe exists, canvas otherwise
   * - `"css"` — force CSS; falls back to the canvas with a dev warning if none exists
   * - `"canvas"` — force the canvas painter
   */
  renderer?: GradientRenderer;
  channelOverrides?: Record<string, number> | false;
}
</script>

<script setup lang="ts">
import { ref } from "vue";
import { useForwardExpose, Primitive } from "reka-ui";
import { cssWheelPolar, getChannelConfig, samplePolarGrid } from "@urcolor/shared";
import { applyChannelOverrides, renderToCanvas, useGradientCanvas } from "../../shared/useGradientCanvas";
import { CSS_GRADIENT_ROOT_STYLE, cssLayerStyle, useCssGradient } from "../../shared/useCssGradient";
import { CHECKERBOARD_STYLE } from "../../shared/checkerboard";
import { injectColorWheelRootContext } from "./ColorWheelRoot.vue";

const props = withDefaults(defineProps<ColorWheelGradientProps>(), {
  as: "span",
  renderer: "auto",
  channelOverrides: () => ({ alpha: 1 }),
});

const rootContext = injectColorWheelRootContext();
useForwardExpose();

const canvasRef = ref<HTMLCanvasElement | null>(null);

// The circle is cut here, as it is on the canvas, and for the same reason: the
// root's own `border-radius` alone would leave the corners of the square
// gradient showing.
const CSS_LAYERS_STYLE = { ...CSS_GRADIENT_ROOT_STYLE, clipPath: "circle(50%)" };

const cssLayers = useCssGradient({
  renderer: () => props.renderer,
  name: "ColorWheelGradient",
  build: () => {
    const colorSpace = rootContext.colorSpace.value;
    const baseColor = rootContext.colorRef.value;
    if (!baseColor) return null;

    const overriddenBase = applyChannelOverrides(baseColor, colorSpace, props.channelOverrides);
    return cssWheelPolar(
      overriddenBase, colorSpace,
      rootContext.angleChannelKey.value, rootContext.radiusChannelKey.value,
      rootContext.startAngle.value,
    );
  },
});

function paint(canvas: HTMLCanvasElement) {
  const colorSpace = rootContext.colorSpace.value;
  const baseColor = rootContext.colorRef.value;
  if (!baseColor) return;

  const overriddenBase = applyChannelOverrides(baseColor, colorSpace, props.channelOverrides);
  const angleCfg = getChannelConfig(colorSpace, rootContext.angleChannelKey.value);
  const radiusCfg = getChannelConfig(colorSpace, rootContext.radiusChannelKey.value);
  if (!angleCfg || !radiusCfg) return;

  const aMin = angleCfg.nativeMin ?? angleCfg.min;
  const aMax = angleCfg.nativeMax ?? angleCfg.max;
  const rMin = radiusCfg.nativeMin ?? radiusCfg.min;
  const rMax = radiusCfg.nativeMax ?? radiusCfg.max;

  const sampleSize = 128;
  const pixels = samplePolarGrid(
    overriddenBase, colorSpace,
    rootContext.angleChannelKey.value, rootContext.radiusChannelKey.value,
    aMin, aMax, rMin, rMax,
    sampleSize, sampleSize,
    rootContext.startAngle.value,
  );
  renderToCanvas({ canvas, pixels, sampleWidth: sampleSize, sampleHeight: sampleSize });
}

useGradientCanvas({
  canvas: canvasRef,
  sources: () => [
    props.channelOverrides,
    rootContext.colorSpace.value, rootContext.angleChannelKey.value, rootContext.radiusChannelKey.value,
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
    :style="{ ...CHECKERBOARD_STYLE, borderRadius: '50%' }"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
  >
    <span
      v-if="cssLayers"
      :style="CSS_LAYERS_STYLE"
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
      :style="{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', clipPath: 'circle(50%)' }"
    />
    <slot />
  </Primitive>
</template>
