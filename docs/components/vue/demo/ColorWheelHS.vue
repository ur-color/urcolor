<script setup lang="ts">
import "internationalized-color/css";
import {
  ColorWheelRoot,
  ColorWheelGradient,
  ColorWheelThumb,
  useColor,
} from "@urcolor/vue";

const { color, hex } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <code>{{ hex }}</code>
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    channel-angle="h"
    channel-radius="s"
    class="relative block size-64 overflow-hidden rounded-full"
    style="container-type: inline-size"
  >
    <ColorWheelGradient class="absolute inset-0 block" />
    <ColorWheelThumb
      class="
        size-4 rounded-full border-2 border-white
        shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
      "
    />
  </ColorWheelRoot>
</template>
