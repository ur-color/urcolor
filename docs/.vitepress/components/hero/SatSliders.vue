<script setup lang="ts">
import type { Color } from "@urcolor/core";
import { setHeroColor, useHeroColor } from "../../composables/useHeroColor";
import {
  ColorSliderGradient,
  ColorSliderRoot,
  ColorSliderThumb,
  ColorSliderTrack,
} from "../../../../packages/vue/src/components/ColorSlider";

const color = useHeroColor();

const CHANNELS = [
  { channel: "h", label: "Hue", overrides: { s: 1, v: 1, alpha: 1 }, alpha: false },
  { channel: "s", label: "Saturation", overrides: { alpha: 1 }, alpha: false },
  { channel: "v", label: "Value", overrides: { alpha: 1 }, alpha: false },
  { channel: "alpha", label: "Alpha", overrides: false, alpha: true },
] as const;

function onUpdate(next: Color | undefined) {
  setHeroColor(color, next);
}
</script>

<template>
  <div class="sat-sliders">
    <ColorSliderRoot
      v-for="c in CHANNELS"
      :key="c.channel"
      :model-value="color"
      color-space="hsv"
      :channel="c.channel"
      as="div"
      class="w-full"
      @update:model-value="onUpdate"
    >
      <ColorSliderTrack
        as="div"
        class="sat-slider-track"
        :class="{ 'sat-slider-alpha': c.alpha }"
      >
        <ColorSliderGradient
          as="div"
          class="absolute inset-0 rounded-lg"
          :channel-overrides="c.overrides"
        />
        <ColorSliderThumb
          class="
            block size-5 rounded-full border-[2.5px] border-white bg-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.25)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_0_3px_var(--vp-c-brand-soft)]
          "
          :aria-label="c.label"
        />
      </ColorSliderTrack>
    </ColorSliderRoot>
  </div>
</template>

<style scoped>
.sat-sliders {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: clamp(110px, 26cqw, 190px);
}

.sat-slider-track {
  position: relative;
  height: 1.25rem;
  border-radius: 0.75rem;
  overflow: hidden;
}

.sat-slider-alpha {
  background: repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / 16px 16px;
}
</style>
