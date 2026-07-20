<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorWheelGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  channelOverrides?: Record<string, number> | false;
}
</script>

<script setup lang="ts">
import { ref } from "vue";
import { useForwardExpose, Primitive } from "reka-ui";
import { samplePolarGrid, getChannelConfig } from "@urcolor/core";
import { applyChannelOverrides, renderToCanvas, useGradientCanvas } from "../../shared/useGradientCanvas";
import { injectColorWheelRootContext } from "./ColorWheelRoot.vue";

const props = withDefaults(defineProps<ColorWheelGradientProps>(), {
  as: "span",
  channelOverrides: () => ({ alpha: 1 }),
});

const rootContext = injectColorWheelRootContext();
useForwardExpose();

const canvasRef = ref<HTMLCanvasElement | null>(null);

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
  renderToCanvas(canvas, pixels, sampleSize, sampleSize);
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
  <Primitive :as-child="asChild" :as="as" :data-disabled="rootContext.disabled.value ? '' : undefined">
    <canvas
      ref="canvasRef"
      :style="{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', clipPath: 'circle(50%)' }"
    />
    <slot />
  </Primitive>
</template>
