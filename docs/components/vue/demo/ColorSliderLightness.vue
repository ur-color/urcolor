<script setup lang="ts">
import { computed } from "vue";
import "internationalized-color/css";
import { getChannelConfig } from "@urcolor/core";
import {
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderThumb,
  useColor,
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");

const gradientColors = computed(() => {
  if (!color.value) return ["black", "white"];
  const cfg = getChannelConfig("hsl", "l");
  if (!cfg) return ["black", "white"];
  const steps = 7;
  const colors: string[] = [];
  const cMin = cfg.culoriMin ?? cfg.min;
  const cMax = cfg.culoriMax ?? cfg.max;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const val = cMin + t * (cMax - cMin);
    colors.push(color.value.set({ mode: "hsl", l: val })?.toString() ?? "black");
  }
  return colors;
});
</script>

<template>
  <ColorSliderRoot
    v-model="color"
    color-space="hsl"
    channel="l"
    as="div"
    class="w-full"
  >
    <ColorSliderTrack
      as="div"
      class="relative h-5 overflow-hidden rounded-xl"
    >
      <ColorSliderGradient
        as="div"
        class="absolute inset-0 rounded-xl"
        :colors="gradientColors"
      />
      <ColorSliderThumb
        class="
          block size-5 rounded-full border-[2.5px] border-white bg-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Lightness"
      />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
