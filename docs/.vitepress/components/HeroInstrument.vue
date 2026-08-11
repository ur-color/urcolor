<script setup lang="ts">
import type { Color } from "@urcolor/core";
import { computed } from "vue";
import { setHeroColor, useHeroColor } from "../composables/useHeroColor";
import {
  ColorRingGradient,
  ColorRingRoot,
  ColorRingThumb,
  ColorRingTrack,
} from "../../../packages/vue/src/components/ColorRing";
import {
  ColorTriangleGradient,
  ColorTriangleRoot,
  ColorTriangleThumb,
} from "../../../packages/vue/src/components/ColorTriangle";

const color = useHeroColor();

/**
 * `triangleVertices` places vertex 0 at the top, and `ColorRingThumb` places
 * itself at `value * 360 + startAngle`, measured from the same origin. With the
 * ring's default `startAngle` of 0, rotating the triangle by the hue points
 * vertex 0 straight at the thumb. Vertex 0 is the corner where the triangle
 * resolves to `xMax, yMax` — full saturation, full value — so the pure-colour
 * corner tracks the hue the ring is pointing at.
 *
 * The rotation is a CSS transform rather than a prop: the triangle's geometry
 * is fixed, and the components map pointer positions back through whatever
 * transform the element carries.
 */
const rotation = computed(() => `rotate(${hue.value}deg)`);
const hue = computed(() => color.value.to("hsv").get("h") as number);

/**
 * The triangle's element is a square that covers the ring's annulus at the
 * corners, so a click meant for the ring lands on the triangle instead.
 * Clipping the element to the triangle itself fixes it: a clipped-out region
 * is not hit-tested, so those corners fall through to the ring underneath.
 *
 * The polygon mirrors `triangleVertices` exactly — vertices at 0, 120 and 240
 * degrees, measured from top and clockwise, on a circle of half the box. The
 * box is square, so its `min(w, h) / 2` is 50%. It needs no hue term: the clip
 * path is in the element's own coordinates, so the transform above turns it
 * along with everything else it clips.
 */
const clipPath = `polygon(${[0, 120, 240].map((offset) => {
  const rad = (offset - 90) * Math.PI / 180;
  return `${(50 + 50 * Math.cos(rad)).toFixed(3)}% ${(50 + 50 * Math.sin(rad)).toFixed(3)}%`;
}).join(", ")})`;

function onUpdate(next: Color | undefined) {
  setHeroColor(color, next);
}
</script>

<template>
  <div class="hero-instrument">
    <ColorRingRoot
      :model-value="color"
      color-space="hsv"
      channel="h"
      :inner-radius="0.82"
      as="div"
      class="hero-ring"
      @update:model-value="onUpdate"
    >
      <ColorRingTrack
        as="div"
        class="relative block size-full"
      >
        <!--
          Pin s and v so the ring paints the full-chroma hue wheel no matter
          what the picked color is. Without this it inherits the current
          saturation and value, and the whole wheel washes out to grey as you
          drag the triangle toward a corner.
        -->
        <ColorRingGradient
          as="div"
          class="absolute inset-0 block"
          :channel-overrides="{ s: 1, v: 1, alpha: 1 }"
        />
        <ColorRingThumb
          class="
            size-5 rounded-full border-[2.5px] border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_2px_6px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_0_0_3px_var(--vp-c-brand-soft)]
          "
          aria-label="Hue"
        />
      </ColorRingTrack>
    </ColorRingRoot>

    <div
      class="hero-core"
      data-core-mode="triangle"
    >
      <ColorTriangleRoot
        :model-value="color"
        color-space="hsv"
        x-channel="s"
        y-channel="v"
        thumb-alignment="contain"
        as="div"
        class="hero-core-layer"
        :style="{ clipPath, transform: rotation }"
        @update:model-value="onUpdate"
      >
        <ColorTriangleGradient
          as="div"
          class="absolute inset-0 block"
        />
        <ColorTriangleThumb
          class="
            size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          "
          aria-label="Saturation and value"
        />
      </ColorTriangleRoot>
    </div>
  </div>
</template>

<style scoped>
.hero-instrument {
  position: relative;
  width: clamp(180px, 46cqmin, 420px);
  aspect-ratio: 1;
}

.hero-ring {
  position: absolute;
  inset: 0;
  display: block;
  container-type: inline-size;
  touch-action: none;
}

/*
 * The core box is exactly the ring's inner circle: innerRadius 0.82 of the
 * outer radius means an inner diameter of 82% of the instrument, so the box
 * insets by (100 - 82) / 2 = 9% on every side.
 *
 * `triangleVertices` puts the triangle's circumradius at `min(w, h) / 2` of
 * this box, which is then precisely the ring's inner radius — the triangle is
 * inscribed in the ring's hole. Keeping the box square is what lets it stay
 * inscribed at every rotation instead of only at one angle.
 */
.hero-core {
  position: absolute;
  inset: 9%;
  /*
   * The wrapper is square and unclipped, so it would swallow ring clicks at
   * the corners even though nothing is drawn there. Only the clipped triangle
   * inside it takes pointer events.
   */
  pointer-events: none;
}

.hero-core-layer {
  pointer-events: auto;
}

.hero-core-layer {
  position: absolute;
  inset: 0;
  display: block;
  touch-action: none;
}
</style>
