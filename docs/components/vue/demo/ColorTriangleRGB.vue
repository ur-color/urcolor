<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import "internationalized-color/css";
import {
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleThumb,
} from "@urcolor/vue";

const color = shallowRef<Color>(Color.parse("hsl(210, 80%, 50%)")!);

function onColorUpdate(c: Color | undefined) {
  if (c) {
    color.value = c;
  }
}
</script>

<template>
  <ColorTriangleRoot
    :model-value="color"
    color-space="rgb"
    channel-x="r"
    channel-y="g"
    channel-z="b"
    class="block relative size-64"
    @update:model-value="onColorUpdate"
  >
    <ColorTriangleGradient class="block absolute inset-0" />
    <ColorTriangleThumb
      class="
        size-4 rounded-full border-2 border-white
        shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
      "
    />
  </ColorTriangleRoot>
</template>
