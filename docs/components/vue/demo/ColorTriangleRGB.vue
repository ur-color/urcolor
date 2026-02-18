<script setup lang="ts">
import "internationalized-color/css";
import {
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleThumb,
  useColor,
} from "@urcolor/vue";

const { color, hex } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <code>{{ hex }}</code>
  <ColorTriangleRoot
    v-model="color"
    color-space="rgb"
    channel-x="r"
    channel-y="g"
    channel-z="b"
    class="relative block size-64"
  >
    <ColorTriangleGradient class="absolute inset-0 block" />
    <ColorTriangleThumb
      class="
        size-4 rounded-full border-2 border-white
        shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
      "
    />
  </ColorTriangleRoot>
</template>
