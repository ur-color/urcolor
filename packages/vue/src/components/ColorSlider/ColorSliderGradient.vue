<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorSliderGradientProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** Array of color stops. Accepts any CSS color string supported by culori (hex, rgb(), hsl(), oklch(), color(), named colors, etc.). Minimum 2 colors. */
  colors: string[];
  /** If true, gradient runs top-to-bottom instead of left-to-right. */
  vertical?: boolean;
  /** When set to a non-RGB color space, interpolates stops in that space for perceptual accuracy. */
  interpolationSpace?: string;
}
</script>

<script setup lang="ts">
import "internationalized-color/css";
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { useForwardExpose, Primitive } from "reka-ui";
import { Color } from "internationalized-color";
import { drawLinearGradient, interpolateStops } from "@urcolor/core";
import { injectColorSliderRootContext } from "./ColorSliderRoot.vue";

const props = withDefaults(defineProps<ColorSliderGradientProps>(), {
  as: "span",
  vertical: false,
});

useForwardExpose();

const rootContext = injectColorSliderRootContext();

const isAlphaChannel = computed(() => rootContext.channel.value === "alpha");

const canvasOpacity = computed(() => {
  if (rootContext.alpha.value && !isAlphaChannel.value) {
    return rootContext.colorRef.value?.alpha ?? 1;
  }
  return 1;
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

function render() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const parsed = props.colors.map((c: string) => Color.parse(c));
  if (parsed.some((c: Color | undefined) => !c) || parsed.length < 2) return;

  const colors = parsed as Color[];

  if (props.interpolationSpace) {
    // Interpolate in the target space, generating sRGB stops
    const interpolated = interpolateStops(colors, 32, props.interpolationSpace);
    drawLinearGradient(canvas, interpolated, props.vertical, isAlphaChannel.value);
  } else {
    drawLinearGradient(canvas, colors, props.vertical, isAlphaChannel.value);
  }
}

useResizeObserver(canvasRef, () => {
  render();
});

watch(
  () => [props.colors, props.vertical, props.interpolationSpace],
  () => render(),
  { flush: "post", deep: true },
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
  >
    <canvas
      ref="canvasRef"
      :style="{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', opacity: canvasOpacity }"
    />
    <slot />
  </Primitive>
</template>
