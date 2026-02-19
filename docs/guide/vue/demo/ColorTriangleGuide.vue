<script setup lang="ts">
import "internationalized-color/css";
import {
  useColor,
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleThumb,
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorTriangleRoot
    v-model="color"
    color-space="hsv"
    channel-x="s"
    channel-y="v"
    as="div"
    class="relative block size-64"
  >
    <ColorTriangleGradient
      as="div"
      class="absolute inset-0 block"
    />
    <ColorTriangleThumb
      class="
        size-4 rounded-full border-2 border-white
        shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
      "
      aria-label="Color"
    />
  </ColorTriangleRoot>
</template>
